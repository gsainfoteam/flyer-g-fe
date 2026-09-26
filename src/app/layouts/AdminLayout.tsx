import { Outlet } from "react-router";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { TopNav } from "@/components/layout/TopNav";
import { useSessionUser } from "@/features/auth/model/auth-context";
import { hasAnyRole } from "@/features/auth/model/types";
import { useSubmissionSummary } from "@/features/submissions/api/queries";

/**
 * 관리 화면 셸. 상단 내비게이션 + 본문 + 푸터.
 *
 * TV 플레이어는 이 셸을 쓰지 않는다. 공공 화면에 관리 메뉴가 보이면 안 된다.
 * (명세 FR-PLY-06)
 */
export function AdminLayout() {
  const user = useSessionUser();
  const isReviewer = hasAnyRole(user, ["REVIEWER", "SUPER_ADMIN"]);

  // 관리자에게만 필요한 수치라 게시자 세션에서는 조회하지 않는다.
  const summary = useSubmissionSummary("all", { enabled: isReviewer });
  const pendingCount = isReviewer ? (summary.data?.pendingReview ?? 0) : 0;

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      <TopNav user={user} pendingCount={pendingCount} />
      <main className="flex-1 px-4 py-8 sm:px-6 lg:px-10 lg:py-9">
        <div className="mx-auto flex max-w-content flex-col gap-6">
          <Outlet />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
