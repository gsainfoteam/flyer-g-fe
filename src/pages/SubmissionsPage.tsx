import { Link } from "react-router";
import { to } from "@/app/router/routes";
import { RecentContentSection } from "@/components/dashboard/RecentContentSection";
import { useSubmissionViews } from "@/features/submissions/api/queries";
import { PageState } from "@/shared/components";
import { formatSeoulDateTime } from "@/shared/lib/datetime";
import { Button } from "@/shared/ui/button";

/**
 * 내 신청 목록.
 *
 * 전체 접근을 위한 pagination, 검색, URL 필터 동기화는 Phase 03 범위다.
 */
export function SubmissionsPage() {
  const list = useSubmissionViews({ limit: 12 });

  return (
    <PageState
      isLoading={list.isPending}
      error={list.error}
      onRetry={() => void list.refetch()}
      loadingRows={5}
    >
      {list.data && (
        <>
          <div className="flex flex-wrap items-end gap-6">
            <div className="min-w-0 flex-1">
              <h1 className="text-display text-ink">
                신청 {list.data.totalCount}건
              </h1>
              <p className="mt-1.5 text-label text-ink-muted">
                {formatSeoulDateTime(list.data.serverTime)} 기준
              </p>
            </div>
            <Button asChild>
              <Link to={to.studio()}>새 게시 신청</Link>
            </Button>
          </div>

          <RecentContentSection submissions={list.data.items} />
        </>
      )}
    </PageState>
  );
}
