import { Link, useSearchParams } from "react-router";
import { to } from "@/app/router/routes";
import { SubmissionRow } from "@/components/common/SubmissionRow";
import { findStatusGroup, getStatusSentence } from "@/entities/submission";
import type { SubmissionView } from "@/entities/submission/model/types";
import { useInfiniteSubmissionViews } from "@/features/submissions/api/queries";
import { StatusGroupTabs } from "@/features/submissions/list/ui/StatusGroupTabs";
import { EmptyState, PageState, Panel, StatusBadge } from "@/shared/components";
import {
  formatSeoulDateTime,
  formatSeoulShortDate,
} from "@/shared/lib/datetime";
import { Button } from "@/shared/ui/button";
import { Spinner } from "@/shared/ui/spinner";

/**
 * 내 신청 전체 목록 (명세 FR-SUB-05, FR-DASH-02).
 *
 * 상태 탭은 URL의 `status`에 동기화한다. 새로고침하거나 링크를 공유해도 같은
 * 화면이 나와야 하고, 대시보드가 특정 탭으로 바로 보낼 수 있어야 한다.
 */
const STATUS_PARAM = "status";

function sentenceFor(submission: SubmissionView): string {
  return getStatusSentence({
    status: submission.status,
    startsAtLabel: formatSeoulDateTime(submission.startAt),
    endsAtLabel: formatSeoulShortDate(submission.endAt),
  });
}

export function SubmissionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const group = findStatusGroup(searchParams.get(STATUS_PARAM));

  const list = useInfiniteSubmissionViews(group.statuses);
  const items = list.data?.items ?? [];

  const selectGroup = (key: string) => {
    setSearchParams(key === "all" ? {} : { [STATUS_PARAM]: key }, {
      replace: true,
    });
  };

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
                {group.key === "all" ? "신청" : group.label}{" "}
                {list.data.totalCount}건
              </h1>
              <p className="mt-1.5 text-label text-ink-muted">
                {formatSeoulDateTime(list.data.serverTime)} 기준
              </p>
            </div>
            <Button asChild>
              <Link to={to.studio()}>새 게시 신청</Link>
            </Button>
          </div>

          <StatusGroupTabs activeKey={group.key} onSelect={selectGroup} />

          <Panel flush>
            {items.length === 0 ? (
              <EmptyState
                title={
                  group.key === "all"
                    ? "아직 신청이 없어요"
                    : `${group.label} 상태의 신청이 없어요`
                }
                description={
                  group.key === "all"
                    ? "Ziggle 공지를 연결해 첫 게시를 신청해 보세요."
                    : "다른 탭을 눌러 보세요."
                }
                action={
                  group.key === "all" && (
                    <Button variant="secondary" size="sm" asChild>
                      <Link to={to.studio()}>게시 신청하기</Link>
                    </Button>
                  )
                }
                className="px-3"
              />
            ) : (
              <ul className="flex flex-col">
                {items.map((submission, index) => (
                  <SubmissionRow
                    key={submission.id}
                    submission={submission}
                    sentence={sentenceFor(submission)}
                    href={to.submissionDetail(submission.id)}
                    className={index > 0 ? "border-t border-line" : undefined}
                    trailing={<StatusBadge status={submission.status} />}
                  />
                ))}
              </ul>
            )}

            {list.hasNextPage && (
              <div className="border-t border-line p-3">
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  disabled={list.isFetchingNextPage}
                  onClick={() => void list.fetchNextPage()}
                >
                  {list.isFetchingNextPage && <Spinner aria-hidden="true" />}
                  더 보기 ({items.length} / {list.data.totalCount})
                </Button>
              </div>
            )}
          </Panel>
        </>
      )}
    </PageState>
  );
}
