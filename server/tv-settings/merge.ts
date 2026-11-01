/**
 * TV 설정 저장 요청을 지금 문서에 합친다. 기기 위젯 설정은 기기별로 덮어쓰고, 시간대 규칙은
 * 목록째 바꾼다. 내용 검사(형식·범위)는 읽는 쪽(`tv-settings.ts`의 `parseTvSettings`)이
 * 다시 하므로 여기서는 모양만 본다. 틀리면 null.
 */
export const MAX_SETTINGS_BYTES = 64 * 1024;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export function mergeTvSettings(
  current: unknown,
  patch: unknown,
  now: Date,
): Record<string, unknown> | null {
  if (!isRecord(patch)) return null;
  const base = isRecord(current) ? current : {};
  const devices = isRecord(base.devices) ? { ...base.devices } : {};
  if (patch.devices !== undefined) {
    if (!isRecord(patch.devices)) return null;
    for (const [id, value] of Object.entries(patch.devices)) {
      if (!id || id.length > 100 || !isRecord(value) || !Array.isArray(value.widgets)) return null;
      devices[id] = value;
    }
  }
  let timeSlots = Array.isArray(base.timeSlots) ? base.timeSlots : null;
  if (patch.timeSlots !== undefined) {
    if (!Array.isArray(patch.timeSlots) || patch.timeSlots.length > 50) return null;
    if (!patch.timeSlots.every(isRecord)) return null;
    timeSlots = patch.timeSlots;
  }
  return { devices, timeSlots, updatedAt: now.toISOString() };
}
