import { Outlet } from "react-router";

/**
 * 게시 신청 셸.
 *
 * 한 가지 일에 집중하는 화면이라 관리 내비게이션을 두지 않는다. 화면 자체가
 * 세 칸을 꽉 채우므로 셸은 높이만 잡아 준다. 실제 제출 흐름은 Phase 02에서 완성한다.
 */
export function StudioLayout() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-canvas text-ink">
      <Outlet />
    </div>
  );
}
