import { ApprovalPanel } from "@/components/dashboard/ApprovalPanel";
import { usePendingReviews } from "@/features/reviews/api/queries";
import { PageState } from "@/shared/components";
import { formatSeoulDateTime } from "@/shared/lib/datetime";

/**
 * 승인 대기 목록.
 *
 * 지금은 읽기 전용이다. 승인·반려는 사유 입력, 검토한 버전 확인, 동시 처리 충돌
 * 처리가 함께 필요해서 Phase 04에서 구현한다. 필터와 pagination도 그때 붙인다.
 */
export function ReviewsPage() {
  const pending = usePendingReviews(20);

  return (
    <PageState
      isLoading={pending.isPending}
      error={pending.error}
      onRetry={() => void pending.refetch()}
      loadingRows={6}
    >
      {pending.data && (
        <>
          <div>
            <h1 className="text-display text-ink">
              승인 대기 {pending.data.totalCount}건
            </h1>
            <p className="mt-1.5 text-label text-ink-muted">
              오래 기다린 순서로 보여드려요. {formatSeoulDateTime(pending.data.serverTime)} 기준.
            </p>
          </div>

          <ApprovalPanel
            submissions={pending.data.items}
            totalCount={pending.data.totalCount}
            now={pending.data.serverTime}
          />
        </>
      )}
    </PageState>
  );
}
