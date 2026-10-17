import { STAGE_HEADER_HEIGHT, TV_STAGE_WIDTH } from "../ui/stage-metrics";
import { posterAspect } from "./types";
import type { PosterRenderModel } from "./types";

/**
 * 흐르는 띠의 칸 배치. 치수는 1920x1080 스테이지 기준 px이고, x는 화면 왼쪽
 * 끝(여백 밖), y는 여백 안쪽 위가 0이다.
 */

/**
 * 가운데 칸 높이. 칸은 이 크기로 그리고, 양옆은 `NEIGHBOR_SCALE`배로 줄인다. 가운데를
 * 키우지 않고 양옆을 줄이므로 가운데 이미지는 늘 원래 해상도로 또렷하다.
 */
const FOCUS_HEIGHT = 680;
/** 양옆 칸은 가운데의 이만큼(높이 약 490px)으로 작게, 흐리게 둔다. */
export const NEIGHBOR_SCALE = 0.72;
/** 아주 넓은 배너가 화면을 혼자 차지하지 않게 칸 폭을 막는다. */
const ITEM_MAX_WIDTH = 1500;
const ITEM_GAP = 36;
/** 띠의 세로 중심(여백 안쪽 기준). 머리 줄 아래 680px 띠의 가운데다. */
const BAND_TOP = STAGE_HEADER_HEIGHT + 24;
const BAND_CENTER = BAND_TOP + FOCUS_HEIGHT / 2;
export const INFO_TOP = BAND_TOP + FOCUS_HEIGHT + 24;
const SCREEN_CENTER = TV_STAGE_WIDTH / 2;

/**
 * 가운데에서 멀수록 흐리게. 가운데만 읽히고 양옆은 "다음에 올 것"의 기척만 남긴다.
 * 화면 끝 칸은 거의 보이지 않게 해 바탕으로 녹아들게 하고, 화면 밖 칸은 0이라
 * 들어오고 나갈 때 툭 나타나거나 사라지지 않는다.
 */
export const OPACITY_BY_DISTANCE = [1, 0.24, 0.07, 0] as const;

/** 한 칸 미는 시간과 곡선. 천천히 출발해 천천히 멈춘다. */
export const SLIDE_DURATION_MS = 900;
export const SLIDE_EASING = "cubic-bezier(0.45, 0, 0.2, 1)";

function itemSize(poster: PosterRenderModel) {
  const aspect = posterAspect(poster);
  const width = Math.min(ITEM_MAX_WIDTH, aspect * FOCUS_HEIGHT);
  return { width, height: width / aspect };
}

export interface PlacedItem {
  /** 띠 위의 절대 위치. React key다. */
  slot: number;
  poster: PosterRenderModel;
  offset: number;
  x: number;
  y: number;
  /** 칸 크기(가운데 기준). 화면에는 `scale`배로 보인다. */
  width: number;
  height: number;
  scale: number;
}

export const mod = (value: number, size: number) =>
  ((value % size) + size) % size;

/**
 * 화면을 덮을 만큼 양옆 칸을 놓고, 화면 밖에 두 칸씩 더 놓는다.
 *
 * 밖에 둔 칸은 투명하다(`OPACITY_BY_DISTANCE`). 한 칸 밀 때 왼쪽 끝 칸은 이 자리로
 * 미끄러지며 서서히 사라지고, 오른쪽에서 들어오는 칸은 여기서 서서히 나타난다.
 * 밖에 칸을 두지 않으면 나가는 칸은 그 자리에서 사라지고 들어오는 칸은 툭 나타난다.
 *
 * 같은 게시물이 한 화면에 두 번 보이지 않게, 놓는 칸은 게시물 수를 넘지 않는다.
 * 남는 자리는 다음 차례(오른쪽)부터 채운다.
 */
const OFFSCREEN_SLOTS = 2;
export function placeStrip(
  posters: PosterRenderModel[],
  focusSlot: number,
): PlacedItem[] {
  const count = posters.length;
  if (count === 0) return [];
  const posterAt = (slot: number) => posters[mod(slot, count)]!;

  const focus = posterAt(focusSlot);
  const focusSize = itemSize(focus);
  const placed: PlacedItem[] = [
    {
      slot: focusSlot,
      poster: focus,
      offset: 0,
      x: SCREEN_CENTER - focusSize.width / 2,
      y: BAND_CENTER - focusSize.height / 2,
      ...focusSize,
      scale: 1,
    },
  ];

  let budget = count - 1;
  const sides = [
    {
      direction: 1,
      edge: SCREEN_CENTER + focusSize.width / 2,
      /** 화면 끝을 넘긴 뒤 더 놓은 칸 수 */
      beyond: -1,
    },
    {
      direction: -1,
      edge: SCREEN_CENTER - focusSize.width / 2,
      beyond: -1,
    },
  ];
  let step = 1;
  const isDone = (side: (typeof sides)[number]) =>
    side.beyond >= OFFSCREEN_SLOTS;
  while (budget > 0 && sides.some((side) => !isDone(side))) {
    for (const side of sides) {
      if (isDone(side) || budget === 0) continue;
      const slot = focusSlot + side.direction * step;
      const poster = posterAt(slot);
      const size = itemSize(poster);
      // 화면에 보이는 폭(줄인 폭)으로 잇는다. scale은 칸 가운데를 기준으로 줄이므로
      // 칸의 왼쪽 위치는 보이는 가운데에서 원래 폭의 절반을 뺀 곳이다.
      const near = side.edge + side.direction * ITEM_GAP;
      const far = near + side.direction * size.width * NEIGHBOR_SCALE;
      const center = (near + far) / 2;
      placed.push({
        slot,
        poster,
        offset: side.direction * step,
        x: center - size.width / 2,
        y: BAND_CENTER - size.height / 2,
        ...size,
        scale: NEIGHBOR_SCALE,
      });
      budget -= 1;
      side.edge = far;
      const pastEdge = side.direction > 0 ? far >= TV_STAGE_WIDTH : far <= 0;
      if (pastEdge || side.beyond >= 0) side.beyond += 1;
    }
    step += 1;
  }
  return placed;
}
