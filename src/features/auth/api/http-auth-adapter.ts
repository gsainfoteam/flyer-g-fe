import { ApiError, isApiError } from "@/shared/api/error";
import { createHttpClient } from "@/shared/api/http-client";
import {
  readNumber,
  readObject,
  readString,
  readStringArray,
} from "@/shared/api/parse";
import { safeReturnTo } from "@/shared/config/routes";
import type { AuthAdapter, CompletedSignIn } from "./auth-adapter";
import {
  createCodeChallenge,
  randomUrlSafe,
  savePendingSignIn,
  takePendingSignIn,
} from "./pkce";
import { createTokenStore } from "./token-store";
import type { TokenGrant, TokenStore } from "./token-store";
import { ROLES } from "../model/types";
import type { Role, SessionUser } from "../model/types";

/**
 * 실제 인증 (`API-CHANGES-BACKEND.md` 2절).
 *
 * 1. 로그인 시작: PKCE 값을 만들어 두고 인포팀 계정의 authorize 화면으로 넘긴다.
 * 2. `/auth/callback`: 돌아온 code를 백엔드 `POST /auth/login`에 넘겨 토큰을 받는다.
 *    client secret은 백엔드만 가진다.
 * 3. API 요청마다 `Authorization: Bearer`를 싣는다. 만료가 가까우면 먼저 갱신하고,
 *    그래도 401이면 한 번 갱신해 다시 보낸다(http client의 `onUnauthorized`).
 * 4. 로그아웃: 서버는 할 일이 없다(204). 이 창의 토큰을 지운다.
 *
 * 인포팀 계정의 로그인 세션은 그대로 남는다. 다시 로그인을 누르면 계정 화면을 거치지
 * 않고 바로 돌아올 수 있다.
 */
export const AUTHORIZE_URL = "https://account.gistory.me/authorize";

/**
 * 요청할 scope. 인포팀 계정(gsainfoteam/account-be)과 백엔드(flyer-g-be) 규칙에 맞춘다.
 *
 * - 백엔드는 IdP 토큰으로 `/oauth/userinfo`를 불러 `name`, `email`(필수)과
 *   `student_id`(있으면 저장)를 쓴다. id_token은 쓰지 않으므로 `openid`를 요청하지
 *   않는다(요청하면 클라이언트에 id_token 허용과 `nonce`가 필요하다). `profile`은
 *   이름이 아니라 프로필 값이다.
 * - 클라이언트 설정의 **필수 scope는 모두 요청해야** 동의와 userinfo가 통과한다.
 *   필수 scope를 늘리면 여기도 함께 늘린다.
 * - `student_id`는 클라이언트에서 선택 scope다. 동의 화면에서 사용자가 빼면 제공자가
 *   그것만 빼고 인가하므로 로그인은 그대로 된다. 학번 인증이 없는 교직원도 로그인할 수
 *   있게 필수로 두지 않는다.
 * - `offline_access`: refreshToken. 새로고침해도 로그인이 이어진다.
 */
export const AUTH_SCOPE = "name email student_id offline_access";

/**
 * `offline_access`를 요청하면 `prompt`가 `consent`나 `login`이어야 한다(제공자 규칙).
 * `login`은 매번 비밀번호를 다시 묻는다. 동의 화면만 거치는 `consent`를 쓴다.
 */
const AUTH_PROMPT = "consent";

/** 만료가 이만큼 남았으면 요청 전에 미리 갱신한다. 요청 도중 만료되지 않게. */
const REFRESH_LEEWAY_MS = 30_000;

export interface HttpAuthAdapter extends AuthAdapter {
  /** 실제 API 요청에 실을 인증 헤더. 만료가 가까우면 먼저 갱신한다. */
  getAuthHeaders(): Promise<Record<string, string>>;
  /** 401 뒤에 부른다. 새 토큰을 받았으면 true. */
  refreshSession(): Promise<boolean>;
}

export interface HttpAuthAdapterOptions {
  apiBaseUrl: string;
  clientId: string;
  redirectUri: string;
  authorizeUrl?: string;
  fetchImpl?: typeof fetch;
  tokenStore?: TokenStore;
  /** PKCE 값을 로그인 복귀까지 들고 있을 곳. 기본 sessionStorage */
  pendingStorage?: Pick<Storage, "getItem" | "setItem" | "removeItem">;
  /** 제공자로 이동한다. 테스트에서 바꾼다. */
  navigate?: (url: string) => void;
  /** 지금 앱의 origin. redirect_uri와 다르면 돌아와도 로그인을 마칠 수 없다. */
  currentOrigin?: string;
  now?: () => number;
}

function authError(code: string, message: string): ApiError {
  return new ApiError({ kind: "unknown", code, message });
}

function isUnauthenticated(error: unknown): boolean {
  return isApiError(error) && error.status === 401;
}

function parseTokenGrant(payload: unknown): TokenGrant {
  const body = readObject(payload);
  const refreshToken = body.refreshToken;
  return {
    accessToken: readString(body, "accessToken"),
    expiresIn: readNumber(body, "expiresIn"),
    refreshToken: typeof refreshToken === "string" ? refreshToken : null,
  };
}

/** `GET /auth/session` → 화면이 쓰는 사용자. 모르는 역할은 버린다. */
export function parseSessionUser(payload: unknown): SessionUser {
  const user = readObject(readObject(payload).user, "user");
  const roles = readStringArray(user, "roles", "user.roles").filter(
    (role): role is Role => (ROLES as readonly string[]).includes(role),
  );
  return {
    id: readString(user, "id", "user.id"),
    displayName: readString(user, "displayName", "user.displayName"),
    roles,
    organizationIds: readStringArray(
      user,
      "organizationIds",
      "user.organizationIds",
    ),
  };
}

export function createHttpAuthAdapter(
  options: HttpAuthAdapterOptions,
): HttpAuthAdapter {
  const now = options.now ?? Date.now;
  const tokens = options.tokenStore ?? createTokenStore({ now });
  const pendingStorage = options.pendingStorage ?? globalThis.sessionStorage;
  const navigate =
    options.navigate ?? ((url: string) => window.location.assign(url));
  const currentOrigin = options.currentOrigin ?? window.location.origin;

  // 토큰 없이 부르는 인증 endpoint(login, refresh)
  const publicClient = createHttpClient({
    baseUrl: options.apiBaseUrl,
    fetchImpl: options.fetchImpl,
  });

  let refreshing: Promise<boolean> | null = null;

  /**
   * refreshToken으로 새 토큰을 받는다. 동시에 여러 요청이 401을 받아도 한 번만 보낸다.
   *
   * 갱신이 401이면, 다른 탭이 그사이 토큰을 바꿔 저장했는지 보고 한 번 더 해 본다.
   * 제공자가 refreshToken을 한 번만 쓰게 하면 탭 두 개가 동시에 갱신할 때 한쪽이 진다.
   */
  const refreshSession = (): Promise<boolean> => {
    refreshing ??= (async () => {
      let used = tokens.getRefreshToken();
      for (let attempt = 0; attempt < 2 && used !== null; attempt += 1) {
        try {
          const grant = parseTokenGrant(
            await publicClient.request({
              method: "POST",
              path: "/auth/refresh",
              body: { refreshToken: used },
            }),
          );
          tokens.save(grant);
          return true;
        } catch (error) {
          if (!isUnauthenticated(error)) throw error;
          const latest = tokens.getRefreshToken();
          if (latest === used) break;
          used = latest;
        }
      }
      tokens.clear();
      return false;
    })().finally(() => {
      refreshing = null;
    });
    return refreshing;
  };

  const getAuthHeaders = async (): Promise<Record<string, string>> => {
    let access = tokens.getAccessToken();
    const expiring =
      access === null || access.expiresAt - now() < REFRESH_LEEWAY_MS;
    if (expiring && tokens.getRefreshToken() !== null) {
      await refreshSession();
      access = tokens.getAccessToken();
    }
    return access ? { Authorization: `Bearer ${access.value}` } : {};
  };

  // 사용자 토큰을 싣는 요청. 401이면 한 번 갱신해 다시 보낸다.
  const client = createHttpClient({
    baseUrl: options.apiBaseUrl,
    fetchImpl: options.fetchImpl,
    getAuthHeaders,
    onUnauthorized: refreshSession,
  });

  const fetchSessionUser = async (signal?: AbortSignal) =>
    parseSessionUser(await client.request({ path: "/auth/session", signal }));

  let completing: { code: string; promise: Promise<CompletedSignIn> } | null =
    null;

  /**
   * code는 한 번만 쓸 수 있다. 화면을 떠나도 교환을 끊지 않는다. 끊으면 서버는 code를
   * 썼는데 토큰은 버려져, 사용자가 처음부터 다시 로그인해야 한다.
   */
  const completeSignIn = async (
    params: URLSearchParams,
  ): Promise<CompletedSignIn> => {
    const providerError = params.get("error");
    if (providerError) {
      throw providerError === "access_denied"
        ? authError("AUTH_DENIED", "로그인을 취소했습니다.")
        : authError(
            "AUTH_FAILED",
            `로그인 제공자가 거절했습니다: ${providerError}`,
          );
    }
    const code = params.get("code");
    const state = params.get("state");
    if (!code || !state) {
      throw authError(
        "AUTH_FAILED",
        "로그인 응답에 code 또는 state가 없습니다.",
      );
    }

    const pending = takePendingSignIn(pendingStorage, now());
    if (pending === null || pending.state !== state) {
      throw authError(
        "AUTH_STATE_MISMATCH",
        "이 창에서 시작한 로그인이 아니거나 너무 오래되었습니다.",
      );
    }

    const grant = parseTokenGrant(
      await publicClient.request({
        method: "POST",
        path: "/auth/login",
        body: {
          code,
          redirectUri: options.redirectUri,
          codeVerifier: pending.codeVerifier,
        },
      }),
    );
    tokens.save(grant);
    return {
      user: await fetchSessionUser(),
      returnTo: safeReturnTo(pending.returnTo),
    };
  };

  return {
    getAuthHeaders,
    refreshSession,

    async restore(signal) {
      if (
        tokens.getAccessToken() === null &&
        tokens.getRefreshToken() === null
      ) {
        return null;
      }
      try {
        return await fetchSessionUser(signal);
      } catch (error) {
        if (!isUnauthenticated(error)) throw error;
        tokens.clear();
        return null;
      }
    },

    async signIn(returnTo) {
      // redirect_uri가 다른 origin이면 돌아왔을 때 PKCE 값이 그쪽 창에 없다.
      if (new URL(options.redirectUri).origin !== currentOrigin) {
        console.error(
          `VITE_AUTH_REDIRECT_URI(${options.redirectUri})의 origin이 지금 앱(${currentOrigin})과 다릅니다.`,
        );
        throw authError(
          "AUTH_REDIRECT_MISMATCH",
          "로그인 복귀 주소가 이 앱의 주소와 다릅니다.",
        );
      }

      const codeVerifier = randomUrlSafe();
      const state = randomUrlSafe(16);
      savePendingSignIn(pendingStorage, {
        state,
        codeVerifier,
        returnTo: safeReturnTo(returnTo),
        createdAt: now(),
      });

      const url = new URL(options.authorizeUrl ?? AUTHORIZE_URL);
      url.search = new URLSearchParams({
        response_type: "code",
        client_id: options.clientId,
        redirect_uri: options.redirectUri,
        scope: AUTH_SCOPE,
        state,
        prompt: AUTH_PROMPT,
        code_challenge: await createCodeChallenge(codeVerifier),
        code_challenge_method: "S256",
      }).toString();
      navigate(url.toString());

      // 페이지를 떠나므로 끝나지 않는다. 돌아오면 `/auth/callback`이 이어 받는다.
      return new Promise<never>(() => {});
    },

    completeSignIn(params) {
      // 개발 모드의 StrictMode는 effect를 두 번 부른다. code는 한 번만 쓸 수 있으므로
      // 같은 code의 두 번째 호출은 첫 호출의 결과를 기다린다.
      const code = params.get("code") ?? "";
      if (completing?.code !== code) {
        completing = { code, promise: completeSignIn(params) };
      }
      return completing.promise;
    },

    async signOut() {
      const access = tokens.getAccessToken();
      tokens.clear();
      if (access === null) return;
      // 서버는 할 일이 없지만 계약대로 알린다. 실패해도 로그아웃은 끝난 것이다.
      await publicClient
        .request({ method: "POST", path: "/auth/logout" })
        .catch(() => undefined);
    },
  };
}
