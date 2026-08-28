import { Link } from "react-router";
import { to } from "@/app/router/routes";
import { ApprovalPanel } from "@/components/dashboard/ApprovalPanel";
import { RecentContentSection } from "@/components/dashboard/RecentContentSection";
import { StatusCountBar } from "@/components/dashboard/StatusCountBar";
import { useSessionUser } from "@/features/auth/model/auth-context";
import { hasAnyRole } from "@/features/auth/model/types";
import { usePendingReviews } from "@/features/reviews/api/queries";
import {
  useSubmissionSummary,
  useSubmissionViews,
} from "@/features/submissions/api/queries";
import type { SubmissionView } from "@/entities/submission/model/types";
import { EmptyState, PageState, Panel } from "@/shared/components";
import {
  formatElapsed,
  formatSeoulDateTime,
  formatSeoulShortDate,
} from "@/shared/lib/datetime";
import { Button } from "@/shared/ui/button";

const HOUSE_LABEL = "학사기숙사 A동, B동";

export function DashboardPage() {
  const user = useSessionUser();
  const isReviewer = hasAnyRole(user, ["REVIEWER", "SUPER_ADMIN"]);

  const summary = useSubmissionSummary(isReviewer ? "all" : "me");
  const list = useSubmissionViews({ limit: 12 });
  const pending = usePendingReviews(5);

  const isLoading = summary.isPending || list.isPending || pending.isPending;
  const error = summary.error ?? list.error ?? pending.error;

  const retry = () => {
    void summary.refetch();
    void list.refetch();
    void pending.refetch();
  };

  const now = summary.data?.calculatedAt ?? new Date();
  const pendingItems = pending.data?.items ?? [];
  const oldestWait = pendingItems[0]
    ? formatElapsed(pendingItems[0].createdAt, now)
    : null;

  const needsFix = (list.data?.items ?? []).filter(
    (item) => item.status === "REJECTED" || item.status === "SUSPENDED",
  ).length;

  return (
    <PageState
      isLoading={isLoading}
      error={error}
      onRetry={retry}
      loadingRows={5}
    >
      {summary.data && list.data && pending.data && (
        <>
          <div className="flex flex-wrap items-end gap-6">
            <div className="min-w-0 flex-1">
              <p className="text-label text-ink-muted">
                {formatSeoulDateTime(now)} · 서버 시각 기준 · {HOUSE_LABEL}
              </p>
              <h1 className="mt-1.5 text-display text-ink">
                {isReviewer ? (
                  summary.data.pendingReview > 0 ? (
                    <>
                      검토를 기다리는 신청{" "}
                      <span className="text-accent">
                        {summary.data.pendingReview}건
                      </span>
                      {oldestWait && (
                        <>
                          , 가장 오래된 건{" "}
                          <span className="text-accent">{oldestWait}</span> 됐어요
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
              <Button asChild>
                <Link to={to.reviews()}>순서대로 검토 시작</Link>
              </Button>
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
              },
              { label: "게시 중", value: summary.data.published },
              { label: "예약됨", value: summary.data.scheduled },
              { label: "종료됨", value: summary.data.ended },
            ]}
            trailing={
              <Button variant="link" size="xs" asChild>
                <Link to={to.submissions()}>
                  전체 {summary.data.total}건 →
                </Link>
              </Button>
            }
          />

          <div className="grid min-w-0 gap-5 lg:grid-cols-[1fr_344px]">
            {isReviewer ? (
              <ApprovalPanel
                submissions={pendingItems}
                totalCount={summary.data.pendingReview}
                now={now}
              />
            ) : (
              <RecentContentSection submissions={list.data.items} />
            )}

            <div className="flex min-w-0 flex-col gap-5">
              <Panel title="디스플레이 2대">
                <ul className="flex flex-col gap-3.5 text-body">
                  <li className="flex items-center gap-2.5">
                    <span className="flex-1 font-semibold">A동 로비</span>
                    <span className="text-label text-ink-muted">12초 전</span>
                    <span className="rounded-pill bg-surface-muted px-2.5 py-1 text-overline text-ink-muted">
                      온라인
                    </span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="flex-1 font-semibold">B동 로비</span>
                    <span className="text-label text-ink-muted">26분 전</span>
                    <span className="rounded-pill bg-attention-subtle px-2.5 py-1 text-overline text-attention-strong">
                      오프라인
                    </span>
                  </li>
                </ul>
                <p className="mt-4 text-caption text-ink-subtle">
                  오프라인 기기는 마지막으로 받은 편성을 계속 재생해요.
                </p>
              </Panel>

              <Panel
                title="지금 TV에 걸린 것"
                action={
                  <Button variant="link" size="xs" asChild>
                    <Link to={to.display("device-preview")}>미리보기 →</Link>
                  </Button>
                }
              >
                <PublishedMini submissions={list.data.items} />
              </Panel>
            </div>
          </div>

          {isReviewer && <RecentContentSection submissions={list.data.items} />}
        </>
      )}
    </PageState>
  );
}

function PublishedMini({ submissions }: { submissions: SubmissionView[] }) {
  const published = submissions
    .filter((submission) => submission.status === "PUBLISHED")
    .slice(0, 3);

  if (published.length === 0) {
    return <EmptyState title="지금 걸린 콘텐츠가 없어요" className="py-2" />;
  }

  return (
    <ul className="flex flex-col gap-3.5">
      {published.map((submission) => (
        <li key={submission.id} className="flex items-center gap-3">
          <div className="aspect-3/4 w-[34px] shrink-0 overflow-hidden rounded-[6px] bg-canvas">
            {submission.posterUrl && (
              <img
                src={submission.posterUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            )}
          </div>
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
