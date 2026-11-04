/**
 * 폰의 참가자 신원. 같은 탭이면 새로고침해도 같은 참가자다(sessionStorage).
 *
 * - `id`: TV가 상태에 실어 모두에게 보내는 공개 값
 * - `secret`: 이 폰만 아는 값. 메시지마다 실어 보내고 TV는 방송하지 않는다. 네트워크가
 *   바뀌어 새 연결로 와도 TV가 같은 폰으로 알아보게 한다(`createPlayerBinding`).
 */
export interface PlayerIdentity {
  id: string;
  secret: string;
}

/**
 * `crypto.randomUUID`는 https나 localhost에서만 있다. 개발 중 폰이 LAN 주소(http)로
 * 들어오면 없으므로 대신 만든다.
 */
function randomId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function stored(key: string): string {
  try {
    const saved = window.sessionStorage.getItem(key);
    if (saved) return saved;
    const created = randomId();
    window.sessionStorage.setItem(key, created);
    return created;
  } catch {
    return randomId();
  }
}

/** `key`는 게임·방마다 다르게 준다. 예: `flyerg:battle-player:<방>` */
export function playerIdentityOf(key: string): PlayerIdentity {
  return { id: stored(key), secret: stored(`${key}:secret`) };
}

/** 보낼 메시지에 비밀 값을 싣는다. */
export const signed = <T extends object>(message: T, secret: string): T => ({ ...message, secret });
