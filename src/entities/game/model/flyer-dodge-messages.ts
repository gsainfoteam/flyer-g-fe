import type { DodgeClientMessage } from "./flyer-dodge";

/**
 * 폰이 보낸 메시지를 믿지 않고 읽는다. 폰은 로그인하지 않으므로 누구나 아무 값이나
 * 보낼 수 있다. 모양이 틀리면 null이고, TV는 그 메시지를 버린다.
 * 이름은 엔진(`normalizeDodgeName`)이 다시 정리한다.
 */
const ID_MAX_LENGTH = 64;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readId = (value: unknown): string | null =>
  typeof value === "string" && value.length > 0 && value.length <= ID_MAX_LENGTH ? value : null;

export function parseDodgeMessage(raw: unknown): DodgeClientMessage | null {
  if (!isRecord(raw)) return null;
  const playerId = readId(raw.playerId);
  if (!playerId) return null;

  switch (raw.kind) {
    case "hello":
    case "leave":
      return { kind: raw.kind, playerId };
    case "join": {
      if (typeof raw.name !== "string" || typeof raw.ticket !== "string") return null;
      // 엔진이 정리하기 전에 터무니없이 긴 값은 미리 자른다.
      return { kind: "join", playerId, name: raw.name.slice(0, 48), ticket: raw.ticket.slice(0, 16) };
    }
    case "move":
      return raw.direction === -1 || raw.direction === 0 || raw.direction === 1
        ? { kind: "move", playerId, direction: raw.direction }
        : null;
    default:
      return null;
  }
}
