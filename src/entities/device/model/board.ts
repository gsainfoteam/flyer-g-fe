import {
  FOUR_GRID_SLOT_COUNT,
  clampRotationSeconds,
} from "@/entities/playlist/model/types";
import type { LayoutType } from "@/entities/playlist/model/types";
import type { DisplayDevice } from "./types";

/**
 * TV 한 대의 편성을 게시 중 목록과 기기 설정으로 계산한다.
 *
 * TV는 받은 포스터를 건너뛰지 않고 차례로 돌린다. 그래서 포스터 한 장이 얼마나
 * 자주 나오는지는 기록을 모으지 않아도 지금 편성으로 정해진다 — 걸린 장수, 한
 * 화면에 몇 장(한 장씩·4분할), 전환 간격. 운영자는 기기 관리에서 화면 구성과 전환
 * 간격을 바꿀 수 있어, 이 값이 판단 근거가 된다.
 */

/** 이 기기가 받는 게시물인가. 대상 위치가 비어 있으면 모든 기기다. 서버 편성과 같은 규칙이다. */
export function isTargetedTo(
  device: Pick<DisplayDevice, "groupIds">,
  targetGroupIds: readonly string[],
): boolean {
  return (
    targetGroupIds.length === 0 ||
    targetGroupIds.some((groupId) => device.groupIds.includes(groupId))
  );
}

export function postersPerScreen(layout: LayoutType): number {
  return layout === "FOUR_GRID" ? FOUR_GRID_SLOT_COUNT : 1;
}

export interface BoardRotation {
  /** 이 TV에 걸린 포스터 수 */
  posterCount: number;
  /** 한 화면에 보이는 장수 */
  perScreen: number;
  /** 한 화면이 머무는 시간(초). 서버 값을 안전 범위로 맞춘 값이다. */
  rotationSeconds: number;
  /**
   * 모든 포스터가 한 번씩 나오는 데 걸리는 시간(초). 한 화면에 다 들어가 넘기지
   * 않으면 null이다.
   */
  cycleSeconds: number | null;
  /** 포스터 한 장이 한 시간에 나오는 횟수. 넘기지 않거나 걸린 게 없으면 null */
  timesPerHour: number | null;
}

export function boardRotationOf(
  device: Pick<DisplayDevice, "layout">,
  posterCount: number,
): BoardRotation {
  const perScreen = postersPerScreen(device.layout.type);
  const rotationSeconds = clampRotationSeconds(device.layout.rotationSeconds);
  const pages = Math.ceil(posterCount / perScreen);
  const rotates = pages > 1;
  const cycleSeconds = rotates ? pages * rotationSeconds : null;
  return {
    posterCount,
    perScreen,
    rotationSeconds,
    cycleSeconds,
    timesPerHour: cycleSeconds ? Math.floor(3600 / cycleSeconds) : null,
  };
}

/**
 * 연결은 살아 있는데 포스터를 오래 못 띄우고 있으면 재생이 멈춘 것으로 본다.
 * 이미지를 못 불러오거나 화면이 멈춘 경우다. 연결 끊김(heartbeat)만으로는 모른다.
 */
export const RENDER_STALL_MS = 10 * 60 * 1000;

/**
 * 재생이 멈췄는가. 걸린 포스터가 없으면 띄울 게 없으니 멈춘 게 아니다.
 * 정상 재생 기록이 한 번도 없으면(`null`) 판단하지 않는다 — 방금 켠 TV를
 * 멈춘 것으로 잘못 알리지 않기 위해서다.
 */
export function isRenderStalled(
  device: Pick<DisplayDevice, "status" | "lastRenderOkAt">,
  now: Date,
  hasPosters: boolean,
): boolean {
  return (
    device.status === "ONLINE" &&
    hasPosters &&
    device.lastRenderOkAt !== null &&
    now.getTime() - device.lastRenderOkAt.getTime() > RENDER_STALL_MS
  );
}
