/**
 * 원본 긴 변이 이보다 짧으면 TV(1920x1080)에서 크게 늘려 그려 흐려진다.
 *
 * 서버는 해상도로 거절하지 않으므로 검토자가 판단할 근거로만 쓴다. 비율은 보지 않는다.
 * 포스터·정방형·가로 배너 모두 긴 변이 화면을 채우는 쪽이다.
 */
export const LOW_RESOLUTION_LONG_EDGE_PX = 1080;

/** 원본 크기가 TV에서 흐려질 만큼 작은지 본다. 크기를 모르면(0) 경고하지 않는다. */
export function isLowResolution(size: { width: number; height: number }) {
  const longEdge = Math.max(size.width, size.height);
  return longEdge > 0 && longEdge < LOW_RESOLUTION_LONG_EDGE_PX;
}
