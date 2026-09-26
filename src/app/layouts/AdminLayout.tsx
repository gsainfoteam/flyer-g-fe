import { Outlet } from "react-router";
import { SiteFooter } from "@/widgets/layout/SiteFooter";
import { TopNav } from "@/widgets/layout/TopNav";
import { useSessionUser } from "@/features/auth/model/auth-context";
import { hasAnyRole } from "@/features/auth/model/types";
import { useSubmissionSummary } from "@/features/submissions/api/queries";

/**
 * 관리 화면 셸. 상단 내비게이션 + 본문 + 푸터.
 *
 * TV 플레이어는 이 셸을 쓰지 않는다. 공공 화면에 관리 메뉴가 보이면 안 된다.
 * (명세 FR-PLY-06)
 */
const MAIN_ID = "main-content";

export function AdminLayout() {
  const user = useSessionUser();
  const isReviewer = hasAnyRole(user, ["REVIEWER", "SUPER_ADMIN"]);

  // 관리자에게만 필요한 수치라 게시자 세션에서는 조회하지 않는다.
  const summary = useSubmissionSummary("all", { enabled: isReviewer });
  const pendingCount = isReviewer ? (summary.data?.pendingReview ?? 0) : 0;

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      {/* 키보드 사용자가 매 화면마다 메뉴를 지나지 않고 본문으로 간다. */}
      <a
        href={`#${MAIN_ID}`}
        className="sr-only z-(--layer-toast) rounded-control bg-ink px-3 py-2 text-label text-ink-inverse focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        본문으로 건너뛰기
      </a>
      <TopNav user={user} pendingCount={pendingCount} />
      <main
        id={MAIN_ID}
        tabIndex={-1}
        className="flex-1 px-4 py-8 outline-none sm:px-6 lg:px-10 lg:py-9"
      >
        <div className="mx-auto flex max-w-content flex-col gap-6">
          <Outlet />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
