import { Outlet } from "react-router";

/**
 * TV 플레이어 셸.
 *
 * 관리 내비게이션도 푸터도 없다. 사람이 조작하지 않는 화면이라 이동 수단을 두지
 * 않는다. 사용자 로그인도 요구하지 않는다 — 기기는 기기 전용 자격 증명으로
 * 편성을 받는다. (명세 3.1, FR-PLY-01)
 */
export function DisplayLayout() {
  return (
    <div className="tv-surface h-screen overflow-hidden text-ink">
      <Outlet />
    </div>
  );
}
