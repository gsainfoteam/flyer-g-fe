import type { DisplayFrame } from "@/entities/poster/model/frames";
import type { WidgetContent } from "./content";
import type { WidgetSlot } from "./types";

/** 플레이어가 차례로 보여 주는 화면. 포스터 화면이거나 위젯이다. */
export type PlayerFrame =
  | DisplayFrame
  | { kind: "widget"; key: string; slot: WidgetSlot; content: WidgetContent };

/**
 * 한 바퀴의 화면 순서. 위젯은 자리(`widget-slot`)만 잡아 두고, 그 자리에 왔을 때 어떤
 * 위젯을 띄울지 고른다(`policy.ts`). 시간대·간격 조건이 시각에 따라 바뀌기 때문이다.
 */
export type FrameTemplate = DisplayFrame | { kind: "widget-slot"; key: string };

/**
 * 포스터 화면 `interval`장마다 위젯 자리를 하나 둔다.
 *
 * 포스터가 없으면 위젯 자리 하나만 둔다 — 위젯만 차례로 돈다. 포스터가 `interval`보다
 * 적으면 바퀴 끝에 한 자리를 둔다. key에 자리 번호를 넣어 회전이 위치를 잃지 않게 한다.
 */
export function placeWidgetSlots(
  frames: DisplayFrame[],
  interval: number,
): FrameTemplate[] {
  if (interval <= 0) return frames;
  if (frames.length === 0) return [{ kind: "widget-slot", key: "wslot:only" }];

  const result: FrameTemplate[] = [];
  frames.forEach((frame, index) => {
    result.push(frame);
    const shown = index + 1;
    if (shown % interval === 0) result.push({ kind: "widget-slot", key: `wslot:${shown}` });
  });
  if (frames.length < interval) result.push({ kind: "widget-slot", key: "wslot:end" });
  return result;
}

/** 이 화면이 머무는 시간(초). 위젯은 자기 시간, 포스터는 기기 전환 간격이다. */
export function frameDurationSeconds(
  frame: PlayerFrame,
  rotationSeconds: number,
): number {
  return frame.kind === "widget" ? frame.slot.durationSeconds : rotationSeconds;
}
