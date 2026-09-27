/**
 * OAuth 로그인 시작과 복귀 사이에 들고 있는 값 (PKCE, RFC 7636).
 *
 * 로그인 제공자로 넘어갔다 돌아오는 동안 페이지가 새로 뜨므로, 시작할 때 만든 값을
 * sessionStorage에 두었다가 `/auth/callback`에서 꺼내 쓴다. 한 번 꺼내면 지운다.
 *
 * - `state`: 돌아온 요청이 이 창에서 시작한 로그인인지 확인한다(CSRF 방지).
 * - `codeVerifier`: code를 가로챈 쪽이 토큰으로 바꾸지 못하게 한다.
 * - `returnTo`: 로그인 후 돌아갈 앱 내부 경로.
 */
const PENDING_KEY = "flyerg:auth:pending";

/** 로그인 화면에서 이만큼 넘게 머물렀다 돌아오면 다시 시작하게 한다. */
const PENDING_TTL_MS = 10 * 60 * 1000;

export interface PendingSignIn {
  state: string;
  codeVerifier: string;
  returnTo: string;
  createdAt: number;
}

type SessionStorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** 추측할 수 없는 URL-safe 문자열. 32바이트면 43자로 PKCE 최소 길이를 넘는다. */
export function randomUrlSafe(byteLength = 32): string {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(byteLength)));
}

export async function createCodeChallenge(codeVerifier: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(codeVerifier),
  );
  return toBase64Url(new Uint8Array(digest));
}

export function savePendingSignIn(
  storage: SessionStorageLike,
  pending: PendingSignIn,
): void {
  storage.setItem(PENDING_KEY, JSON.stringify(pending));
}

/** 저장해 둔 값을 꺼내고 지운다. 없거나 오래됐거나 모양이 틀리면 null. */
export function takePendingSignIn(
  storage: SessionStorageLike,
  now: number,
): PendingSignIn | null {
  let raw: string | null;
  try {
    raw = storage.getItem(PENDING_KEY);
    storage.removeItem(PENDING_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  try {
    const value = JSON.parse(raw) as Partial<PendingSignIn>;
    if (
      typeof value.state !== "string" ||
      typeof value.codeVerifier !== "string" ||
      typeof value.returnTo !== "string" ||
      typeof value.createdAt !== "number" ||
      now - value.createdAt > PENDING_TTL_MS
    ) {
      return null;
    }
    return value as PendingSignIn;
  } catch {
    return null;
  }
}
