import {
  STAGE_HEADER_GAP,
  STAGE_HEADER_HEIGHT,
  TV_STAGE_HEIGHT,
  TV_STAGE_PADDING,
  TV_STAGE_WIDTH,
} from "../ui/stage-metrics";
import { posterAspect } from "./types";
import type { PosterRenderModel } from "./types";

/** 하나씩 크게 보기의 이미지 칸. 치수는 1920x1080 스테이지 기준 px다. */

/** 여백 안쪽에서 머리 줄을 뺀 본문 영역 */
const CONTENT_WIDTH = TV_STAGE_WIDTH - TV_STAGE_PADDING * 2;
const CONTENT_HEIGHT =
  TV_STAGE_HEIGHT -
  TV_STAGE_PADDING * 2 -
  STAGE_HEADER_HEIGHT -
  STAGE_HEADER_GAP;

/**
 * 이 비율보다 넓으면 이미지를 위에, 글을 아래에 둔다. 16:9까지는 옆에 둬도 이미지
 * 크기가 위에 둘 때와 거의 같고 글 칸이 넉넉하다. 그보다 넓은 배너는 옆에 두면
 * 납작해진다.
 */
export const STACKED_ASPECT = 2;
/** 옆에 둘 때 이미지 최대 폭. 글 칸이 이 정도는 남아야 제목이 읽힌다. */
const SIDE_IMAGE_MAX_WIDTH = 1000;
/** 위에 둘 때 이미지 최대 높이. 아래 글 줄이 QR(240px)을 담을 만큼 남긴다. */
const STACKED_IMAGE_MAX_HEIGHT = 560;

/** 이미지 칸 크기. 비율을 지키며 정해진 상자 안에서 가장 크게 잡는다. */
export function spotlightImageSize(poster: PosterRenderModel): {
  width: number;
  height: number;
  stacked: boolean;
} {
  const aspect = posterAspect(poster);
  if (aspect > STACKED_ASPECT) {
    const width = Math.min(CONTENT_WIDTH, aspect * STACKED_IMAGE_MAX_HEIGHT);
    return { width, height: width / aspect, stacked: true };
  }
  const width = Math.min(SIDE_IMAGE_MAX_WIDTH, aspect * CONTENT_HEIGHT);
  return { width, height: width / aspect, stacked: false };
}
