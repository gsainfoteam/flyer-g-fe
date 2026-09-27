import { Link } from "react-router";
import { to } from "@/shared/config/routes";
import { PosterThumb } from "@/entities/poster/ui/PosterThumb";
import { ApprovalPanel } from "@/widgets/dashboard/ApprovalPanel";
import { RecentContentSection } from "@/widgets/dashboard/RecentContentSection";
import { PREVIEW_DEVICE_ID } from "@/entities/playlist/model/types";
import { DeviceStatusPanel } from "@/widgets/dashboard/DeviceStatusPanel";
import { StatusCountBar } from "@/widgets/dashboard/StatusCountBar";
import { useSessionUser } from "@/features/auth/model/auth-context";
import { hasAnyRole } from "@/features/auth/model/types";
import { useTargetGroups } from "@/entities/device/api/queries";
import { usePendingReviews } from "@/features/reviews/api/queries";
import {
  useSubmissionSummary,
  useSubmissionViews,
} from "@/features/submissions/api/queries";
import { fromSubmissionView } from "@/entities/poster";
import type { SubmissionView } from "@/entities/submission/model/types";
import { EmptyState, PageState, Panel } from "@/shared/components";
import {
  formatElapsed,
  formatSeoulDateTime,
  formatSeoulShortDate,
} from "@/shared/lib/datetime";
import { Button } from "@/shared/ui/button";

export function DashboardPage() {
  const user = useSessionUser();
  const isReviewer = hasAnyRole(user, ["REVIEWER", "SUPER_ADMIN"]);

  const scope = isReviewer ? "all" : "me";
  const summary = useSubmissionSummary(scope);
  // TV에 걸린 것은 내 신청 목록에서 고르지 않고 따로 조회한다. 관리자에게는
  // 전체, 게시자에게는 본인 것이 걸려 있는지가 궁금한 것이다.
  const published = useSubmissionViews({
    statuses: ["PUBLISHED"],
    scope: isReviewer ? "all" : "me",
    limit: 3,
  });
  // 승인 대기는 관리자 전용 API다. 게시자 세션에서는 조회하지 않고,
  // 로딩·오류 판정에서도 뺀다.
  const pending = usePendingReviews(5, { enabled: isReviewer });
  const targetGroups = useTargetGroups();
  const locationLabel = targetGroups.data
    ?.map((group) => group.name)
    .join(", ");

  const isLoading =
    summary.isPending ||
    published.isPending ||
    (isReviewer && pending.isPending);
  const error =
    summary.error ?? published.error ?? (isReviewer ? pending.error : null);

  const retry = () => {
    void summary.refetch();
    void published.refetch();
    if (isReviewer) void pending.refetch();
  };

  const pendingItems = pending.data?.items ?? [];
  const oldest = pendingItems[0];

  /** 게시자가 고쳐서 다시 내야 하는 신청. 서버 요약의 상태별 건수로 센다. */
  const needsFix = summary.data
    ? summary.data.byStatus.REJECTED + summary.data.byStatus.SUSPENDED
    : 0;
  const listHref = (groupKey?: string) =>
    to.submissions(groupKey, isReviewer ? { scope: "all" } : undefined);

  return (
    <PageState
      isLoading={isLoading}
      error={error}
      onRetry={retry}
      loadingRows={5}
    >
      {summary.data && published.data && (!isReviewer || pending.data) && (
        <>
          <div className="flex flex-wrap items-end gap-6">
            <div className="min-w-0 flex-1">
              <p className="text-label text-ink-muted">
                {formatSeoulDateTime(summary.data.calculatedAt)} · 서버 시각
                기준
                {locationLabel && <> · {locationLabel}</>}
              </p>
              <h1 className="mt-1.5 text-display text-ink">
                {isReviewer ? (
                  summary.data.pendingReview > 0 ? (
                    <>
                      검토를 기다리는 신청{" "}
                      <span className="text-accent">
                        {summary.data.pendingReview}건
                      </span>
                      {oldest && (
                        <>
                          , 가장 오래된 건{" "}
                          <span className="text-accent">
                            {formatElapsed(
                              oldest.submittedAt ?? oldest.createdAt,
                              summary.data.calculatedAt,
                            )}
                          </span>{" "}
                          됐어요
                        </>
                      )}
                    </>
                  ) : (
                    "지금 처리할 신청이 없어요"
                  )
                ) : needsFix > 0 ? (
                  <>
                    고쳐야 할 신청이{" "}
                    <span className="text-accent">{needsFix}건</span> 있어요
                  </>
                ) : (
                  `안녕하세요, ${user.displayName}님`
                )}
              </h1>
            </div>
            {isReviewer ? (
              // 가장 오래 기다린 건부터 연다. 결정하면 다음 건으로 이어진다.
              oldest && (
                <Button asChild>
                  <Link to={to.reviewDetail(oldest.id)}>
                    순서대로 검토 시작
                  </Link>
                </Button>
              )
            ) : (
              <Button asChild>
                <Link to={to.studio()}>새 게시 신청</Link>
              </Button>
            )}
          </div>

          <StatusCountBar
            counts={[
              {
                label: "승인 대기",
                value: summary.data.pendingReview,
                emphasis: isReviewer,
                href: isReviewer ? to.reviews() : listHref("pending"),
              },
              {
                label: "게시 중",
                value: summary.data.published,
                href: listHref("published"),
              },
              {
                label: "예약됨",
                value: summary.data.scheduled,
                href: listHref("approved"),
              },
              {
                label: "종료됨",
                value: summary.data.ended,
                href: listHref("ended"),
              },
            ]}
            trailing={
              <Button variant="link" size="xs" asChild>
                <Link to={listHref()}>전체 {summary.data.total}건 →</Link>
              </Button>
            }
          />

          <div className="grid min-w-0 gap-5 lg:grid-cols-[1fr_344px]">
            {isReviewer ? (
              <ApprovalPanel
                submissions={pendingItems}
                totalCount={summary.data.pendingReview}
                now={summary.data.calculatedAt}
              />
            ) : (
              <RecentContentSection />
            )}

            <div className="flex min-w-0 flex-col gap-5">
              {isReviewer && (
                <DeviceStatusPanel serverNow={summary.data.calculatedAt} />
              )}

              <Panel
                title="지금 TV에 걸린 것"
                action={
                  <Button variant="link" size="xs" asChild>
                    <Link to={to.display(PREVIEW_DEVICE_ID, { preview: true })}>
                      미리보기 →
                    </Link>
                  </Button>
                }
              >
                <PublishedMini submissions={published.data.items} />
              </Panel>
            </div>
          </div>

          {isReviewer && <RecentContentSection />}
        </>
      )}
    </PageState>
  );
}

function PublishedMini({ submissions }: { submissions: SubmissionView[] }) {
  if (submissions.length === 0) {
    return (
      <EmptyState title="지금 TV에 걸린 포스터가 없어요" className="py-2" />
    );
  }

  return (
    <ul className="flex flex-col gap-3.5">
      {submissions.map((submission) => (
        <li key={submission.id} className="flex items-center gap-3">
          <PosterThumb poster={fromSubmissionView(submission)} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-label font-bold text-ink">
              {submission.title}
            </p>
            <p className="text-caption text-ink-muted">
              ~ {formatSeoulShortDate(submission.endAt)}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
