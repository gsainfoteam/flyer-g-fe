import { Outlet } from "react-router";
import { DisplayErrorBoundary } from "@/features/display-runtime/ui/DisplayErrorBoundary";

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
      {/* kiosk에는 새로고침해 줄 사람이 없다. 오류 시 안전 화면 후 자동 복구한다. */}
      <DisplayErrorBoundary>
        <Outlet />
      </DisplayErrorBoundary>
    </div>
  );
}
