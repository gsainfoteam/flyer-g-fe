/**
 * 로그인 토큰 보관 (`API-CHANGES-BACKEND.md` 2절, Bearer + refresh).
 *
 * - accessToken은 **메모리에만** 둔다. 새로고침하면 사라지고 refreshToken으로 다시 받는다.
 *   스크립트가 저장소를 읽는 공격(XSS)에 노출되는 시간을 줄이기 위해서다.
 * - refreshToken은 창을 닫았다 열어도 로그인이 이어지도록 localStorage에 둔다.
 *   매번 저장소에서 다시 읽는다. 다른 탭이 갱신해 바꾼 값을 놓치지 않기 위해서다.
 *
 * 토큰 값은 이 모듈과 auth adapter 밖으로 나가지 않는다. 로그에도 남기지 않는다.
 */
const REFRESH_TOKEN_KEY = "flyerg:auth:refresh-token";

export interface AccessToken {
  value: string;
  /** 만료 시각(epoch ms) */
  expiresAt: number;
}

export interface TokenGrant {
  accessToken: string;
  /** accessToken 유효 시간(초) */
  expiresIn: number;
  /** 갱신 응답에 없으면 가지고 있던 값을 계속 쓴다. */
  refreshToken?: string | null;
}

export interface TokenStore {
  getAccessToken(): AccessToken | null;
  getRefreshToken(): string | null;
  save(grant: TokenGrant): void;
  clear(): void;
}

export interface TokenStoreOptions {
  storage?: Pick<Storage, "getItem" | "setItem" | "removeItem"> | null;
  now?: () => number;
}

function defaultStorage(): TokenStoreOptions["storage"] {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    // 저장소가 막힌 환경(시크릿 창 등). 새로고침하면 다시 로그인한다.
    return null;
  }
}

export function createTokenStore(options: TokenStoreOptions = {}): TokenStore {
  const storage =
    options.storage === undefined ? defaultStorage() : options.storage;
  const now = options.now ?? Date.now;
  let access: AccessToken | null = null;
  // 저장소를 쓸 수 없을 때만 쓰는 메모리 사본
  let memoryRefreshToken: string | null = null;

  const readRefresh = (): string | null => {
    if (!storage) return memoryRefreshToken;
    try {
      return storage.getItem(REFRESH_TOKEN_KEY);
    } catch {
      return memoryRefreshToken;
    }
  };

  const writeRefresh = (value: string | null) => {
    memoryRefreshToken = value;
    if (!storage) return;
    try {
      if (value === null) storage.removeItem(REFRESH_TOKEN_KEY);
      else storage.setItem(REFRESH_TOKEN_KEY, value);
    } catch {
      // 저장하지 못해도 이번 창에서는 메모리 사본으로 동작한다.
    }
  };

  return {
    getAccessToken: () => access,
    getRefreshToken: readRefresh,
    save(grant) {
      access = {
        value: grant.accessToken,
        expiresAt: now() + grant.expiresIn * 1000,
      };
      if (grant.refreshToken) writeRefresh(grant.refreshToken);
    },
    clear() {
      access = null;
      writeRefresh(null);
    },
  };
}
