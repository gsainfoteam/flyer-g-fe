import { Link, useSearchParams } from "react-router";
import { to } from "@/shared/config/routes";
import { SubmissionRow } from "@/entities/submission/ui/SubmissionRow";
import {
  countByStatusGroup,
  findStatusGroup,
  getStatusSentence,
} from "@/entities/submission";
import type { SubmissionView } from "@/entities/submission/model/types";
import { useSessionUser } from "@/features/auth/model/auth-context";
import {
  useInfiniteSubmissionViews,
  useSubmissionSummary,
} from "@/features/submissions/api/queries";
import { StatusGroupTabs } from "@/features/submissions/list/ui/StatusGroupTabs";
import { EmptyState, PageState, Panel } from "@/shared/components";
import { StatusBadge } from "@/entities/submission/ui/StatusBadge";
import {
  formatSeoulDateTime,
  formatSeoulShortDate,
} from "@/shared/lib/datetime";
import { Button } from "@/shared/ui/button";
import { Spinner } from "@/shared/ui/spinner";

/**
 * 전체 컨텐츠 (하우스 관리자·운영자, 명세 FR-DASH-02).
 *
 * 게시 중인 컨텐츠를 중단하려면 관리자가 그 건에 닿을 길이 있어야 한다. 심사 목록에는
 * 이미 승인된 건이 없다. (명세 3.2 "전체 신청 조회") 사용자 자신의 목록은 `MinePage`다.
 *
 * 상태 탭은 URL에 동기화한다. 새로고침하거나 링크를 공유해도 같은 화면이
 * 나와야 하고, 홈이 특정 탭으로 바로 보낼 수 있어야 한다.
 */
const STATUS_PARAM = "status";
const PANEL_ID = "submission-list";

/** 전체 신청(관리자)에서는 누가 올렸는지를 앞에 붙인다. */
function sentenceFor(submission: SubmissionView, withRequester: boolean) {
  const sentence = getStatusSentence({
    status: submission.status,
    startsAtLabel: formatSeoulDateTime(submission.startAt),
    endsAtLabel: formatSeoulShortDate(submission.endAt),
  });
  return withRequester ? `${submission.requesterName} · ${sentence}` : sentence;
}

export function SubmissionsPage() {
  const user = useSessionUser();
  const [searchParams, setSearchParams] = useSearchParams();
  const group = findStatusGroup(searchParams.get(STATUS_PARAM));
  const scope = "all";

  const summary = useSubmissionSummary(scope);
  const list = useInfiniteSubmissionViews(group.statuses, scope);
  const items = list.data?.items ?? [];
  const counts = summary.data
    ? countByStatusGroup(summary.data.byStatus)
    : undefined;

  const updateParams = (patch: Record<string, string | null>) => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        for (const [key, value] of Object.entries(patch)) {
          if (value === null) next.delete(key);
          else next.set(key, value);
        }
        return next;
      },
      { replace: true },
    );
  };

  const title = "전체 컨텐츠";

  return (
    <>
      <div className="flex flex-wrap items-end gap-6">
        <div className="min-w-0 flex-1">
          <h1 className="text-display text-ink">
            {group.key === "all" ? title : `${title} · ${group.label}`}
            {list.data && ` ${list.data.totalCount}건`}
          </h1>
          <p className="mt-1.5 text-label text-ink-muted">
            {list.data
              ? `${formatSeoulDateTime(list.data.serverTime)} 기준`
              : "불러오는 중"}
          </p>
        </div>
        <Button variant="secondary" asChild>
          <Link to={to.mine()}>내 컨텐츠</Link>
        </Button>
      </div>

      <StatusGroupTabs
        activeKey={group.key}
        onSelect={(key) =>
          updateParams({ [STATUS_PARAM]: key === "all" ? null : key })
        }
        counts={counts}
        panelId={PANEL_ID}
      />

      <div
        id={PANEL_ID}
        role="tabpanel"
        aria-labelledby={`status-tab-${group.key}`}
      >
        <PageState
          isLoading={list.isPending}
          error={list.error}
          onRetry={() => void list.refetch()}
          loadingRows={5}
        >
          {list.data && (
            <Panel flush>
              {items.length === 0 ? (
                <EmptyState
                  title={
                    group.key === "all"
                      ? "아직 들어온 컨텐츠가 없어요"
                      : `${group.label} 상태의 컨텐츠가 없어요`
                  }
                  description="다른 탭을 눌러 보세요."
                  className="px-3"
                />
              ) : (
                // 구분선은 li에 그린다. rounded가 걸린 행 안쪽에 그리면 모서리를 따라 휜다.
                <ul className="flex flex-col divide-y divide-line">
                  {items.map((submission) => (
                    <SubmissionRow
                      key={submission.id}
                      submission={submission}
                      sentence={sentenceFor(submission, true)}
                      // 관리자가 남의 신청을 누르면 결정·중단을 할 수 있는 검토 화면으로 간다.
                      href={
                        submission.requesterId !== user.id
                          ? to.reviewDetail(submission.id)
                          : to.submissionDetail(submission.id)
                      }
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
          )}
        </PageState>
      </div>
    </>
  );
}
