import { describe, expect, it, vi } from "vitest";
import { createHttpAuthAdapter, parseSessionUser } from "./http-auth-adapter";
import type { HttpAuthAdapterOptions } from "./http-auth-adapter";
import { createCodeChallenge } from "./pkce";
import { createTokenStore } from "./token-store";

const API = "https://api.example.com";
const APP = "https://app.example.com";
const REDIRECT_URI = `${APP}/auth/callback`;

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
  };
}

const SESSION = {
  user: {
    id: "user_01",
    displayName: "홍길동",
    email: "hong@example.com",
    roles: ["SUBMITTER", "REVIEWER"],
    organizationIds: [],
  },
  expiresAt: "2026-09-27T08:00:00.000Z",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const unauthorized = () =>
  json({ code: "UNAUTHENTICATED", message: "만료", requestId: "req" }, 401);

type Handler = (init: RequestInit) => Response | Promise<Response>;

/** 경로별 응답을 정해 두는 가짜 서버. 부른 요청을 기록한다. */
function fakeServer(routes: Record<string, Handler>) {
  const calls: { path: string; init: RequestInit }[] = [];
  const fetchImpl = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = new URL(String(input)).pathname;
      calls.push({ path, init: init ?? {} });
      const handler = routes[path];
      if (!handler) throw new Error(`예상하지 못한 요청: ${path}`);
      return handler(init ?? {});
    },
  );
  const bodyOf = (index: number) =>
    JSON.parse(String(calls[index]!.init.body)) as Record<string, unknown>;
  const headerOf = (index: number, name: string) =>
    (calls[index]!.init.headers as Record<string, string>)[name];
  return {
    fetchImpl: fetchImpl as unknown as typeof fetch,
    calls,
    bodyOf,
    headerOf,
  };
}

function setup(
  routes: Record<string, Handler>,
  overrides: Partial<HttpAuthAdapterOptions> & { refreshToken?: string } = {},
) {
  let clock = Date.parse("2026-09-27T06:00:00.000Z");
  const now = () => clock;
  const local = memoryStorage();
  const pending = memoryStorage();
  const tokenStore = createTokenStore({ storage: local, now });
  if (overrides.refreshToken) {
    local.setItem("flyerg:auth:refresh-token", overrides.refreshToken);
  }
  const server = fakeServer(routes);
  const navigate = vi.fn();
  const adapter = createHttpAuthAdapter({
    apiBaseUrl: API,
    clientId: "flyer-g",
    redirectUri: REDIRECT_URI,
    currentOrigin: APP,
    fetchImpl: server.fetchImpl,
    tokenStore,
    pendingStorage: pending,
    navigate,
    now,
    ...overrides,
  });
  return {
    adapter,
    server,
    navigate,
    local,
    pending,
    tokenStore,
    advance: (ms: number) => {
      clock += ms;
    },
  };
}

/** 로그인을 시작해 제공자로 넘어간 주소에서 state를 꺼낸다. */
async function startSignIn(
  ctx: ReturnType<typeof setup>,
  returnTo = "/reviews",
) {
  void ctx.adapter.signIn(returnTo);
  await vi.waitFor(() => expect(ctx.navigate).toHaveBeenCalled());
  return new URL(ctx.navigate.mock.calls[0]![0] as string);
}

describe("createHttpAuthAdapter", () => {
  describe("로그인 시작", () => {
    it("PKCE 값을 만들어 인포팀 계정 authorize 화면으로 보낸다", async () => {
      const ctx = setup({});
      const url = await startSignIn(ctx);

      expect(`${url.origin}${url.pathname}`).toBe(
        "https://account.gistory.me/authorize",
      );
      expect(Object.fromEntries(url.searchParams)).toMatchObject({
        response_type: "code",
        client_id: "flyer-g",
        redirect_uri: REDIRECT_URI,
        scope: "name email student_id offline_access",
        // refreshToken을 받으려면 동의 화면을 거쳐야 한다(제공자 규칙).
        prompt: "consent",
        code_challenge_method: "S256",
      });
      // id_token을 요청하지 않으므로 nonce를 보내지 않는다. 보내면 제공자가 거절한다.
      expect(url.searchParams.has("nonce")).toBe(false);

      const saved = JSON.parse(ctx.pending.getItem("flyerg:auth:pending")!);
      expect(saved.state).toBe(url.searchParams.get("state"));
      expect(saved.returnTo).toBe("/reviews");
      expect(url.searchParams.get("code_challenge")).toBe(
        await createCodeChallenge(saved.codeVerifier),
      );
    });

    it("외부 주소를 returnTo로 받지 않는다", async () => {
      const ctx = setup({});
      await startSignIn(ctx, "https://evil.example.com");
      const saved = JSON.parse(ctx.pending.getItem("flyerg:auth:pending")!);
      expect(saved.returnTo).toBe("/");
    });

    it("redirect_uri가 지금 앱과 다른 origin이면 넘기지 않고 알린다", async () => {
      const ctx = setup({}, { currentOrigin: "http://localhost:5173" });
      vi.spyOn(console, "error").mockImplementation(() => {});

      await expect(ctx.adapter.signIn("/")).rejects.toMatchObject({
        code: "AUTH_REDIRECT_MISMATCH",
      });
      expect(ctx.navigate).not.toHaveBeenCalled();
    });
  });

  describe("로그인 복귀", () => {
    it("code를 토큰으로 바꾸고 세션 사용자와 돌아갈 경로를 준다", async () => {
      const ctx = setup({
        "/auth/login": () =>
          json({
            accessToken: "access-1",
            refreshToken: "refresh-1",
            expiresIn: 3600,
          }),
        "/auth/session": () => json(SESSION),
      });
      const url = await startSignIn(ctx);
      const saved = JSON.parse(ctx.pending.getItem("flyerg:auth:pending")!);

      const result = await ctx.adapter.completeSignIn(
        new URLSearchParams({
          code: "code-1",
          state: url.searchParams.get("state")!,
        }),
      );

      expect(result).toEqual({
        user: {
          id: "user_01",
          displayName: "홍길동",
          roles: ["SUBMITTER", "REVIEWER"],
          organizationIds: [],
        },
        returnTo: "/reviews",
      });
      expect(ctx.server.bodyOf(0)).toEqual({
        code: "code-1",
        redirectUri: REDIRECT_URI,
        codeVerifier: saved.codeVerifier,
      });
      expect(ctx.server.headerOf(1, "Authorization")).toBe("Bearer access-1");
      expect(ctx.local.getItem("flyerg:auth:refresh-token")).toBe("refresh-1");
      // 한 번 쓴 PKCE 값은 남기지 않는다.
      expect(ctx.pending.getItem("flyerg:auth:pending")).toBeNull();
    });

    it("같은 code로 두 번 불러도 서버에는 한 번만 보낸다", async () => {
      const ctx = setup({
        "/auth/login": () => json({ accessToken: "access-1", expiresIn: 3600 }),
        "/auth/session": () => json(SESSION),
      });
      const url = await startSignIn(ctx);
      const params = new URLSearchParams({
        code: "code-1",
        state: url.searchParams.get("state")!,
      });

      const [first, second] = await Promise.all([
        ctx.adapter.completeSignIn(params),
        ctx.adapter.completeSignIn(params),
      ]);

      expect(second).toBe(first);
      expect(
        ctx.server.calls.filter((call) => call.path === "/auth/login"),
      ).toHaveLength(1);
    });

    it("이 창에서 시작하지 않은 로그인은 받지 않는다", async () => {
      const ctx = setup({});
      await startSignIn(ctx);

      await expect(
        ctx.adapter.completeSignIn(
          new URLSearchParams({ code: "c", state: "other" }),
        ),
      ).rejects.toMatchObject({ code: "AUTH_STATE_MISMATCH" });
      expect(ctx.server.calls).toHaveLength(0);
    });

    it("오래된 로그인 시작 값은 버린다", async () => {
      const ctx = setup({});
      const url = await startSignIn(ctx);
      ctx.advance(11 * 60 * 1000);

      await expect(
        ctx.adapter.completeSignIn(
          new URLSearchParams({
            code: "c",
            state: url.searchParams.get("state")!,
          }),
        ),
      ).rejects.toMatchObject({ code: "AUTH_STATE_MISMATCH" });
    });

    it("사용자가 제공자에서 취소하면 AUTH_DENIED", async () => {
      const ctx = setup({});
      await expect(
        ctx.adapter.completeSignIn(
          new URLSearchParams({ error: "access_denied" }),
        ),
      ).rejects.toMatchObject({ code: "AUTH_DENIED" });
    });
  });

  describe("세션 복원", () => {
    it("토큰이 없으면 서버에 묻지 않고 로그아웃 상태다", async () => {
      const ctx = setup({});
      await expect(ctx.adapter.restore()).resolves.toBeNull();
      expect(ctx.server.calls).toHaveLength(0);
    });

    it("새로고침 뒤에는 refreshToken으로 토큰을 다시 받아 세션을 복원한다", async () => {
      const ctx = setup(
        {
          "/auth/refresh": () =>
            json({ accessToken: "access-2", expiresIn: 3600 }),
          "/auth/session": () => json(SESSION),
        },
        { refreshToken: "refresh-1" },
      );

      await expect(ctx.adapter.restore()).resolves.toMatchObject({
        id: "user_01",
      });
      expect(ctx.server.bodyOf(0)).toEqual({ refreshToken: "refresh-1" });
      expect(ctx.server.headerOf(1, "Authorization")).toBe("Bearer access-2");
      // 갱신 응답에 새 refreshToken이 없으면 가지고 있던 것을 계속 쓴다.
      expect(ctx.local.getItem("flyerg:auth:refresh-token")).toBe("refresh-1");
    });

    it("refreshToken이 만료되었으면 지우고 로그아웃 상태로 둔다", async () => {
      const ctx = setup(
        { "/auth/refresh": unauthorized, "/auth/session": unauthorized },
        { refreshToken: "refresh-old" },
      );

      await expect(ctx.adapter.restore()).resolves.toBeNull();
      expect(ctx.local.getItem("flyerg:auth:refresh-token")).toBeNull();
    });

    it("서버에 닿지 못하면 로그아웃시키지 않고 오류로 알린다", async () => {
      const ctx = setup(
        {
          "/auth/refresh": () => {
            throw new TypeError("Failed to fetch");
          },
        },
        { refreshToken: "refresh-1" },
      );

      await expect(ctx.adapter.restore()).rejects.toMatchObject({
        code: "NETWORK_ERROR",
      });
      expect(ctx.local.getItem("flyerg:auth:refresh-token")).toBe("refresh-1");
    });
  });

  describe("토큰 갱신", () => {
    it("만료가 가까우면 요청 전에 먼저 갱신한다", async () => {
      let issued = 0;
      const ctx = setup(
        {
          "/auth/refresh": () => {
            issued += 1;
            return json({ accessToken: `access-${issued}`, expiresIn: 60 });
          },
        },
        { refreshToken: "refresh-1" },
      );

      await expect(ctx.adapter.getAuthHeaders()).resolves.toEqual({
        Authorization: "Bearer access-1",
      });
      // 아직 넉넉하면 그대로 쓴다.
      ctx.advance(20_000);
      await expect(ctx.adapter.getAuthHeaders()).resolves.toEqual({
        Authorization: "Bearer access-1",
      });
      // 30초 안쪽으로 남으면 새로 받는다.
      ctx.advance(15_000);
      await expect(ctx.adapter.getAuthHeaders()).resolves.toEqual({
        Authorization: "Bearer access-2",
      });
    });

    it("여러 요청이 동시에 갱신해도 서버에는 한 번만 보낸다", async () => {
      const ctx = setup(
        {
          "/auth/refresh": () =>
            json({ accessToken: "access-2", expiresIn: 3600 }),
        },
        { refreshToken: "refresh-1" },
      );

      const results = await Promise.all([
        ctx.adapter.refreshSession(),
        ctx.adapter.refreshSession(),
        ctx.adapter.getAuthHeaders(),
      ]);

      expect(results.slice(0, 2)).toEqual([true, true]);
      expect(ctx.server.calls).toHaveLength(1);
    });

    it("다른 탭이 먼저 갱신해 토큰이 바뀌었으면 새 토큰으로 한 번 더 해 본다", async () => {
      const local = memoryStorage();
      const ctx = setup(
        {
          "/auth/refresh": (init) => {
            const { refreshToken } = JSON.parse(String(init.body));
            if (refreshToken === "refresh-1") {
              // 이 요청이 가는 사이 다른 탭이 먼저 갱신해 새 토큰을 저장했다.
              local.setItem("flyerg:auth:refresh-token", "refresh-2");
              return unauthorized();
            }
            return json({
              accessToken: "access-3",
              refreshToken: "refresh-3",
              expiresIn: 3600,
            });
          },
        },
        { tokenStore: createTokenStore({ storage: local }) },
      );
      local.setItem("flyerg:auth:refresh-token", "refresh-1");

      await expect(ctx.adapter.refreshSession()).resolves.toBe(true);
      expect([ctx.server.bodyOf(0), ctx.server.bodyOf(1)]).toEqual([
        { refreshToken: "refresh-1" },
        { refreshToken: "refresh-2" },
      ]);
      expect(local.getItem("flyerg:auth:refresh-token")).toBe("refresh-3");
    });
  });

  describe("로그아웃", () => {
    it("토큰을 지우고 서버에 알린다. 서버가 실패해도 로그아웃은 끝난다", async () => {
      const ctx = setup(
        {
          "/auth/refresh": () =>
            json({ accessToken: "access-1", expiresIn: 3600 }),
          "/auth/logout": () => json({ code: "SERVER_ERROR" }, 500),
        },
        { refreshToken: "refresh-1" },
      );
      await ctx.adapter.refreshSession();

      await expect(ctx.adapter.signOut()).resolves.toBeUndefined();
      expect(ctx.server.calls.at(-1)?.path).toBe("/auth/logout");
      expect(ctx.tokenStore.getAccessToken()).toBeNull();
      expect(ctx.local.getItem("flyerg:auth:refresh-token")).toBeNull();
      await expect(ctx.adapter.getAuthHeaders()).resolves.toEqual({});
    });

    it("로그아웃 전에 보낸 갱신의 응답이 뒤늦게 와도 토큰을 다시 저장하지 않는다", async () => {
      let respond: (response: Response) => void = () => {};
      const ctx = setup(
        {
          "/auth/refresh": () =>
            new Promise<Response>((resolve) => {
              respond = resolve;
            }),
          "/auth/logout": () => new Response(null, { status: 204 }),
        },
        { refreshToken: "refresh-1" },
      );

      const refreshing = ctx.adapter.refreshSession();
      await vi.waitFor(() => expect(ctx.server.calls).toHaveLength(1));
      await ctx.adapter.signOut();
      respond(
        json({
          accessToken: "access-late",
          refreshToken: "refresh-late",
          expiresIn: 3600,
        }),
      );

      await expect(refreshing).resolves.toBe(false);
      expect(ctx.tokenStore.getAccessToken()).toBeNull();
      expect(ctx.tokenStore.getRefreshToken()).toBeNull();
      expect(ctx.local.getItem("flyerg:auth:refresh-token")).toBeNull();
    });
  });
});

describe("parseSessionUser", () => {
  it("모르는 역할은 버린다", () => {
    const user = parseSessionUser({
      user: { ...SESSION.user, roles: ["SUBMITTER", "OWNER"] },
    });
    expect(user.roles).toEqual(["SUBMITTER"]);
  });

  it("필수 필드가 없으면 INVALID_RESPONSE로 멈춘다", () => {
    expect(() => parseSessionUser({ user: { id: "user_01" } })).toThrow(
      expect.objectContaining({ code: "INVALID_RESPONSE" }),
    );
  });
});
