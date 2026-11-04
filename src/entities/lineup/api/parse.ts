import { invalidResponse, readArray, readBoolean, readIsoDate, readNullableString, readNumber, readObject, readString } from "@/shared/api/parse";
import type { JsonObject } from "@/shared/api/parse";
import type { BlockSchedule, Lineup, LineupBlock, LineupProgram, LineupSettings, PlaybackLineup } from "../model/types";

function integer(o: JsonObject, key: string, min: number, max: number): number {
  const n = readNumber(o, key);
  if (!Number.isInteger(n) || n < min || n > max) throw invalidResponse(key, `${min}~${max} 정수`);
  return n;
}
function time(o: JsonObject, key: string): string {
  const s = readString(o, key);
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(s)) throw invalidResponse(key, "HH:mm");
  return s;
}
function timeRange(raw: unknown) {
  const o = readObject(raw);
  const start = time(o, "start"), end = time(o, "end");
  if (start === end) throw invalidResponse("end", "시작과 다른 시각");
  return { start, end };
}
export function parseSchedule(raw: unknown): BlockSchedule {
  const o = readObject(raw);
  switch (o.type) {
    case "ALWAYS": return { type: "ALWAYS" };
    case "DATE_RANGE": {
      const from = readIsoDate(o, "from"), to = readIsoDate(o, "to");
      if (from >= to) throw invalidResponse("to", "시작 이후 시각");
      return { type: "DATE_RANGE", from: from.toISOString(), to: to.toISOString() };
    }
    case "WINDOWS": {
      const windows = readArray(o.windows).map((raw) => {
        const w = readObject(raw);
        const days = readArray(w.days).map((day) => integer({ day }, "day", 1, 7));
        if (!days.length || new Set(days).size !== days.length) throw invalidResponse("days", "중복 없는 요일");
        return { ...timeRange(w), days };
      });
      if (!windows.length || windows.length > 8) throw invalidResponse("windows", "1~8개 시간대");
      return { type: "WINDOWS", windows };
    }
    default: throw invalidResponse("schedule.type", "지원하는 일정 종류");
  }
}
export function parseLineupSettings(raw: unknown): LineupSettings {
  const o = readObject(raw);
  if (o.posterLayout !== "WALL" && o.posterLayout !== "STRIP") throw invalidResponse("posterLayout", "WALL 또는 STRIP");
  return {
    posterLayout: o.posterLayout,
    rotationSeconds: integer(o, "rotationSeconds", 5, 60),
    refreshAfterSeconds: integer(o, "refreshAfterSeconds", 15, 300),
    infoBar: readArray(o.infoBar).map((raw) => {
      const item = readObject(raw);
      return { item: readString(item, "item"), programId: readString(item, "programId") };
    }),
    quietHours: readArray(o.quietHours).map(timeRange),
  };
}
export function parseLineupBlock(raw: unknown): LineupBlock {
  const o = readObject(raw);
  if (o.source !== "SUBMISSIONS" && o.source !== "PROGRAM") throw invalidResponse("source", "블록 종류");
  const type = readNullableString(o, "submissionType");
  if (o.source === "SUBMISSIONS" && type !== "POSTER" && type !== "EVENT_BANNER" && type !== "STORY") throw invalidResponse("submissionType", "신청 종류");
  return {
    id: readString(o, "id"), source: o.source,
    submissionType: o.source === "SUBMISSIONS" ? type as LineupBlock["submissionType"] : null,
    programId: o.source === "PROGRAM" ? readString(o, "programId") : null,
    perVisit: o.source === "SUBMISSIONS" ? integer(o, "perVisit", 1, 10) : null,
    durationSeconds: integer(o, "durationSeconds", 5, 300),
    schedule: parseSchedule(o.schedule), enabled: readBoolean(o, "enabled"),
  };
}
export function parseProgram(raw: unknown): LineupProgram {
  const o = readObject(raw);
  return { type: readString(o, "type"), name: readString(o, "name"), params: readObject(o.params), data: o.data == null ? null : readObject(o.data) };
}
export function parsePlaybackLineup(raw: unknown): PlaybackLineup {
  const o = readObject(raw);
  const programs = readObject(o.programs ?? {});
  return { settings: parseLineupSettings(o.settings), blocks: readArray(o.blocks).map(parseLineupBlock),
    programs: Object.fromEntries(Object.entries(programs).map(([id, raw]) => [id, parseProgram(raw)])) };
}
export function parseLineup(raw: unknown): Lineup {
  const o = readObject(raw);
  return { groupId: readString(o, "groupId"), version: integer(o, "version", 1, Number.MAX_SAFE_INTEGER),
    settings: parseLineupSettings(o.settings), blocks: readArray(o.blocks).map(parseLineupBlock),
    updatedAt: readIsoDate(o, "updatedAt").toISOString() };
}
