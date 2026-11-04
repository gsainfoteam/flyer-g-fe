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
 *
 * 그렇게 둔 자리가 `minSlots`보다 적으면(포스터가 적어 한 바퀴가 짧을 때) `minSlots`개를
 * 포스터 사이에 고르게 나눠 둔다. 포스터 1장에 3자리면 P W W W, 2장에 2자리면 P W P W.
 */
export function placeWidgetSlots(
  frames: DisplayFrame[],
  interval: number,
  minSlots = 0,
): FrameTemplate[] {
  if (interval <= 0 && minSlots <= 0) return frames;
  if (frames.length === 0) return [{ kind: "widget-slot", key: "wslot:only" }];

  const regular =
    interval > 0
      ? Math.floor(frames.length / interval) + (frames.length < interval ? 1 : 0)
      : 0;
  if (regular < minSlots) return spreadSlots(frames, minSlots);

  const result: FrameTemplate[] = [];
  frames.forEach((frame, index) => {
    result.push(frame);
    const shown = index + 1;
    if (shown % interval === 0) result.push({ kind: "widget-slot", key: `wslot:${shown}` });
  });
  if (frames.length < interval) result.push({ kind: "widget-slot", key: "wslot:end" });
  return result;
}

/** `count`개 자리를 포스터 화면 뒤마다 고르게 나눠 둔다. */
function spreadSlots(frames: DisplayFrame[], count: number): FrameTemplate[] {
  const result: FrameTemplate[] = [];
  frames.forEach((frame, index) => {
    result.push(frame);
    const before = Math.floor((index * count) / frames.length);
    const after = Math.floor(((index + 1) * count) / frames.length);
    for (let slot = before; slot < after; slot++) {
      result.push({ kind: "widget-slot", key: `wslot:fill:${slot}` });
    }
  });
  return result;
}
