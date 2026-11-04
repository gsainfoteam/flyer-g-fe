/**
 * 서버 연결 id ↔ 참가자 id.
 *
 * 폰이 보내는 참가자 id는 폰이 정한 값이라 남의 id를 적을 수 있다(TV는 상태에 참가자 id를
 * 실어 모두에게 보낸다). 서버가 붙인 연결 id에 처음 쓴 참가자 id를 묶어 두고, 그 연결이
 * 다른 id를 쓰거나 이미 다른 연결이 쓰는 id를 쓰면 거절한다. 남을 내보내거나 남 대신 누를
 * 수 없다.
 *
 * 다만 폰의 네트워크가 바뀌면(와이파이 ↔ LTE) 서버는 옛 연결이 죽은 것을 한참 뒤(연결 확인
 * 주기 25초, 길게는 50초)에야 안다. 그동안 같은 폰의 새 연결을 막으면 판을 잃는다. 그래서
 * 폰은 참가자 id와 함께 자기만 아는 비밀 값(`secret`, 방송하지 않는다)을 보내고, 같은
 * 비밀 값을 대는 새 연결은 그 참가자를 바로 넘겨받는다.
 */
const SECRET_MAX_LENGTH = 64;

/** 메시지의 비밀 값. 없거나 모양이 틀리면 undefined */
export function readSecret(raw: unknown): string | undefined {
  if (typeof raw !== "object" || raw === null) return undefined;
  const secret = (raw as Record<string, unknown>).secret;
  return typeof secret === "string" && secret.length >= 16 && secret.length <= SECRET_MAX_LENGTH
    ? secret
    : undefined;
}

export function createPlayerBinding() {
  const playerOf = new Map<string, string>();
  const connectionOf = new Map<string, string>();
  const secretOf = new Map<string, string>();

  const bind = (from: string, playerId: string) => {
    const previous = connectionOf.get(playerId);
    if (previous !== undefined) playerOf.delete(previous);
    playerOf.set(from, playerId);
    connectionOf.set(playerId, from);
  };

  return {
    /**
     * 이 연결이 이 참가자 id로 말해도 되는가. 처음이면 묶는다. 연결 id가 없으면(같은
     * 브라우저 탭끼리, 또는 채널이 대신 만든 메시지) 확인하지 않는다.
     * 다른 연결이 쓰는 id라도 처음 그 id에 묶인 비밀 값을 대면 이 연결로 넘겨받는다.
     */
    claim(from: string | undefined, playerId: string, secret?: string): boolean {
      if (from === undefined) return true;
      const bound = playerOf.get(from);
      if (bound !== undefined) return bound === playerId;
      const known = secretOf.get(playerId);
      if (connectionOf.has(playerId)) {
        if (known === undefined || secret !== known) return false;
        bind(from, playerId);
        return true;
      }
      // 끊겼다 돌아온 id다. 비밀 값을 알던 id면 같은 값을 대야 한다.
      if (known !== undefined && secret !== known) return false;
      bind(from, playerId);
      if (secret !== undefined && known === undefined) secretOf.set(playerId, secret);
      return true;
    },
    /**
     * 연결이 끊겼을 때. 그 연결의 참가자 id를 풀어 돌려준다. 새 연결이 다시 쓸 수 있다.
     * 이미 새 연결이 넘겨받은 참가자면 null(나간 것이 아니다).
     */
    release(from: string): string | null {
      const playerId = playerOf.get(from);
      if (playerId === undefined) return null;
      playerOf.delete(from);
      connectionOf.delete(playerId);
      return playerId;
    },
  };
}
