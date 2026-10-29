import { BATTLE_RULES, TEAMS } from "./click-battle";
import type { BattleClientMessage, Team } from "./click-battle";

/**
 * 폰이 보낸 메시지를 믿지 않고 읽는다. 폰은 로그인하지 않으므로 누구나 아무 값이나
 * 보낼 수 있다. 모양이 틀리면 null이고, TV는 그 메시지를 버린다.
 *
 * TV 화면에 그대로 나가는 이름은 여기서 거르지 않고 `normalizeName`이 다룬다.
 */
const ID_MAX_LENGTH = 64;
/** 한 번에 보내는 연타 수의 상한. 초당 상한은 엔진이 따로 자른다. */
const TAPS_MAX_PER_MESSAGE = 1_000;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readId = (value: unknown): string | null =>
  typeof value === "string" && value.length > 0 && value.length <= ID_MAX_LENGTH
    ? value
    : null;

const readTeam = (value: unknown): Team | null =>
  (TEAMS as readonly unknown[]).includes(value) ? (value as Team) : null;

export function parseClientMessage(raw: unknown): BattleClientMessage | null {
  if (!isRecord(raw)) return null;
  const playerId = readId(raw.playerId);
  if (!playerId) return null;

  switch (raw.kind) {
    case "hello":
    case "leave":
      return { kind: raw.kind, playerId };
    case "join": {
      const team = readTeam(raw.team);
      if (!team || typeof raw.name !== "string") return null;
      // 엔진이 정리하기 전에 터무니없이 긴 값은 미리 자른다.
      return { kind: "join", playerId, team, name: raw.name.slice(0, BATTLE_RULES.nameMaxLength * 4) };
    }
    case "taps": {
      const count = raw.count;
      if (typeof count !== "number" || !Number.isInteger(count) || count <= 0) return null;
      return { kind: "taps", playerId, count: Math.min(count, TAPS_MAX_PER_MESSAGE) };
    }
    default:
      return null;
  }
}
