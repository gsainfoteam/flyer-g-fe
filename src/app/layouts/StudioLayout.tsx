import { Outlet } from "react-router";

/**
 * 게시 신청 셸.
 *
 * 한 가지 일에 집중하는 화면이라 관리 내비게이션을 두지 않는다. 넓은 화면에서는
 * 세 칸이 화면 높이를 꽉 채우고 칸마다 스크롤한다. 좁은 화면에서는 칸이 세로로
 * 쌓이므로 페이지 전체가 스크롤한다.
 */
export function StudioLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink lg:h-screen lg:overflow-hidden">
      <Outlet />
    </div>
  );
}
