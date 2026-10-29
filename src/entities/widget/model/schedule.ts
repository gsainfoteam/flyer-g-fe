import type { DisplayFrame } from "@/entities/poster/model/frames";
import type { WidgetSlot } from "./types";

/** 플레이어가 차례로 보여 주는 화면. 포스터 화면이거나 위젯이다. */
export type PlayerFrame =
  | DisplayFrame
  | { kind: "widget"; key: string; slot: WidgetSlot };

/**
 * 포스터 화면 사이에 위젯을 끼운다.
 *
 * 각 위젯은 포스터 화면 `everyFrames`장마다 한 번 나온다. 같은 자리에 여럿이 걸리면
 * 편성 순서대로 잇는다. 포스터가 없으면 위젯만 돈다 — 빈 화면 안내보다 낫다.
 *
 * key에 자리 번호를 넣는다. 같은 위젯이 한 바퀴에 여러 번 나와도 회전이 위치를
 * 잃지 않는다.
 */
export function interleaveWidgets(
  frames: DisplayFrame[],
  slots: WidgetSlot[],
): PlayerFrame[] {
  if (slots.length === 0) return frames;
  if (frames.length === 0) {
    return slots.map((slot) => ({ kind: "widget", key: `widget:${slot.id}`, slot }));
  }

  const result: PlayerFrame[] = [];
  frames.forEach((frame, index) => {
    result.push(frame);
    const shown = index + 1;
    for (const slot of slots) {
      if (shown % slot.everyFrames === 0) {
        result.push({ kind: "widget", key: `widget:${slot.id}:${shown}`, slot });
      }
    }
  });

  // 포스터가 everyFrames보다 적어 한 번도 못 나온 위젯은 바퀴 끝에 한 번 둔다.
  for (const slot of slots) {
    if (frames.length < slot.everyFrames) {
      result.push({ kind: "widget", key: `widget:${slot.id}:end`, slot });
    }
  }
  return result;
}

/** 이 화면이 머무는 시간(초). 위젯은 자기 시간, 포스터는 기기 전환 간격이다. */
export function frameDurationSeconds(
  frame: PlayerFrame,
  rotationSeconds: number,
): number {
  return frame.kind === "widget" ? frame.slot.durationSeconds : rotationSeconds;
}
