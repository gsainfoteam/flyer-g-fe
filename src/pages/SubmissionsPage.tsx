import { Link, useSearchParams } from "react-router";
import { to } from "@/app/router/routes";
import { SubmissionRow } from "@/components/common/SubmissionRow";
import {
  countByStatusGroup,
  findStatusGroup,
  getStatusSentence,
} from "@/entities/submission";
import type { SubmissionView } from "@/entities/submission/model/types";
import { useSessionUser } from "@/features/auth/model/auth-context";
import { hasAnyRole } from "@/features/auth/model/types";
import {
  useInfiniteSubmissionViews,
  useSubmissionSummary,
} from "@/features/submissions/api/queries";
import { StatusGroupTabs } from "@/features/submissions/list/ui/StatusGroupTabs";
import { EmptyState, PageState, Panel, StatusBadge } from "@/shared/components";
import {
  formatSeoulDateTime,
  formatSeoulShortDate,
} from "@/shared/lib/datetime";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Spinner } from "@/shared/ui/spinner";

/**
 * 신청 목록 (명세 FR-SUB-05, FR-DASH-02).
 *
 * 기본은 내 신청이다. 관리자는 `scope=all`로 모든 신청을 본다. 게시 중인 신청을
 * 중단하려면 관리자가 그 신청에 닿을 길이 있어야 한다. 승인 대기 목록에는 이미
 * 승인된 건이 없다. (명세 3.2 "전체 신청 조회")
 *
 * 상태 탭과 범위는 URL에 동기화한다. 새로고침하거나 링크를 공유해도 같은 화면이
 * 나와야 하고, 대시보드가 특정 탭으로 바로 보낼 수 있어야 한다.
 */
const STATUS_PARAM = "status";
const SCOPE_PARAM = "scope";
const PANEL_ID = "submission-list";

function sentenceFor(submission: SubmissionView, withOrganization: boolean) {
  const sentence = getStatusSentence({
    status: submission.status,
    startsAtLabel: formatSeoulDateTime(submission.startAt),
    endsAtLabel: formatSeoulShortDate(submission.endAt),
  });
  return withOrganization && submission.organizationName
    ? `${submission.organizationName} · ${sentence}`
    : sentence;
}

export function SubmissionsPage() {
  const user = useSessionUser();
  const isReviewer = hasAnyRole(user, ["REVIEWER", "SUPER_ADMIN"]);
  const [searchParams, setSearchParams] = useSearchParams();
  const group = findStatusGroup(searchParams.get(STATUS_PARAM));
  // 게시자가 scope=all 링크로 들어와도 내 신청을 보여준다. 서버도 403을 준다.
  const scope =
    isReviewer && searchParams.get(SCOPE_PARAM) === "all" ? "all" : "me";

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

  const title = scope === "all" ? "전체 신청" : "내 신청";

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
        <Button asChild>
          <Link to={to.studio()}>새 게시 신청</Link>
        </Button>
      </div>

      {isReviewer && (
        <div
          role="group"
          aria-label="보는 범위"
          className="inline-flex self-start rounded-lg bg-surface-muted p-0.75"
        >
          {(
            [
              ["me", "내 신청"],
              ["all", "전체 신청"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={scope === value}
              onClick={() =>
                updateParams({ [SCOPE_PARAM]: value === "all" ? "all" : null })
              }
              className={cn(
                "rounded-md px-3.5 py-1 text-label font-semibold transition",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
                scope === value
                  ? "bg-surface text-ink shadow-card"
                  : "text-ink-muted hover:text-ink",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}

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
                      ? scope === "all"
                        ? "아직 들어온 신청이 없어요"
                        : "아직 신청이 없어요"
                      : `${group.label} 상태의 신청이 없어요`
                  }
                  description={
                    group.key === "all" && scope === "me"
                      ? "Ziggle 공지를 연결해 첫 게시를 신청해 보세요."
                      : "다른 탭을 눌러 보세요."
                  }
                  action={
                    group.key === "all" &&
                    scope === "me" && (
                      <Button variant="secondary" size="sm" asChild>
                        <Link to={to.studio()}>새 게시 신청</Link>
                      </Button>
                    )
                  }
                  className="px-3"
                />
              ) : (
                // 구분선은 li에 그린다. rounded가 걸린 행 안쪽에 그리면 모서리를 따라 휜다.
                <ul className="flex flex-col divide-y divide-line">
                  {items.map((submission) => (
                    <SubmissionRow
                      key={submission.id}
                      submission={submission}
                      sentence={sentenceFor(submission, scope === "all")}
                      // 관리자가 남의 신청을 누르면 결정·중단을 할 수 있는 검토 화면으로 간다.
                      href={
                        scope === "all" && submission.requesterId !== user.id
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
