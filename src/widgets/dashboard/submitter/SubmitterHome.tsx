import type { ReactNode } from "react";
import { Link } from "react-router";
import { useImpressionStats } from "@/entities/impression/api/queries";
import {
  impressionRange,
  indexImpressions,
} from "@/entities/impression/model/types";
import type {
  SubmissionStatus,
  SubmissionSummary,
  SubmissionView,
} from "@/entities/submission/model/types";
import { useSessionUser } from "@/features/auth/model/auth-context";
import {
  useSubmissionSummary,
  useSubmissionViews,
} from "@/features/submissions/api/queries";
import { PageState, Panel } from "@/shared/components";
import { to } from "@/shared/config/routes";
import { Button } from "@/shared/ui/button";
import { DashboardColumns, PanelCount } from "../DashboardColumns";
import { DashboardHeader } from "../DashboardHeader";
import { ActiveSubmissionCard } from "./ActiveSubmissionCard";
import { ActivityFeedPanel } from "./ActivityFeedPanel";
import { PastSubmissionsPanel } from "./PastSubmissionsPanel";
import { SubmitterWelcome } from "./SubmitterWelcome";

/**
 * 게시자 홈.
 *
 * 게시자는 신청이 몇 건 없다고 보고 짠다. 건수 표 대신 진행 중인 신청을 카드로
 * 크게 보여주고, 곁에 최근 소식과 지난 신청을 둔다. 신청이 하나도 없으면 같은 칸에
 * 신청 안내를 채운다.
 */
const ACTIVE_STATUSES: readonly SubmissionStatus[] = [
  "REJECTED",
  "SUSPENDED",
  "PENDING_REVIEW",
  "APPROVED",
  "SCHEDULED",
  "PUBLISHED",
];
const PAST_STATUSES: readonly SubmissionStatus[] = ["ENDED", "CANCELED"];
const ACTIVE_LIMIT = 10;
const PAST_LIMIT = 3;
/** 지난 신청의 노출까지 보려고 1년을 묻는다(서버 최대 366일). */
const IMPRESSION_DAYS = 365;

/** 고쳐야 할 것 → 걸려 있는 것 → 걸릴 것 → 검토 중인 것 순서 */
const ORDER: Partial<Record<SubmissionStatus, number>> = {
  REJECTED: 0,
  SUSPENDED: 0,
  PUBLISHED: 1,
  SCHEDULED: 2,
  APPROVED: 2,
  PENDING_REVIEW: 3,
};

export function SubmitterHome() {
  const user = useSessionUser();
  const summary = useSubmissionSummary("me");
  const active = useSubmissionViews({
    statuses: ACTIVE_STATUSES,
    scope: "me",
    limit: ACTIVE_LIMIT,
  });
  const past = useSubmissionViews({
    statuses: PAST_STATUSES,
    scope: "me",
    limit: PAST_LIMIT,
  });
  const now = summary.data?.calculatedAt;
  const stats = useImpressionStats(
    now ? impressionRange(IMPRESSION_DAYS, now) : {},
    { enabled: Boolean(now) },
  );

  return (
    <PageState
      isLoading={summary.isPending || active.isPending || past.isPending}
      error={summary.error ?? active.error ?? past.error}
      onRetry={() => {
        void summary.refetch();
        void active.refetch();
        void past.refetch();
      }}
      loadingRows={4}
    >
      {summary.data && active.data && past.data && (
        <>
          <DashboardHeader
            title={`안녕하세요, ${user.displayName}님`}
            description={describe(summary.data)}
            action={
              summary.data.total > 0 && (
                <Button asChild>
                  <Link to={to.studio()}>새 게시 신청</Link>
                </Button>
              )
            }
          />
          {summary.data.total === 0 ? (
            <SubmitterWelcome />
          ) : (
            <DashboardColumns
              main={
                <ActiveSubmissions
                  submissions={active.data.items}
                  impressions={indexImpressions(stats.data)}
                  now={active.data.serverTime}
                />
              }
              side={
                <>
                  <ActivityFeedPanel
                    submissions={[...active.data.items, ...past.data.items]}
                    now={active.data.serverTime}
                  />
                  <PastSubmissionsPanel
                    submissions={past.data.items}
                    totalCount={past.data.totalCount}
                    impressions={indexImpressions(stats.data)}
                  />
                </>
              }
            />
          )}
        </>
      )}
    </PageState>
  );
}

function ActiveSubmissions({
  submissions,
  impressions,
  now,
}: {
  submissions: SubmissionView[];
  impressions: ReturnType<typeof indexImpressions>;
  now: Date;
}) {
  const ordered = [...submissions].sort(
    (a, b) => (ORDER[a.status] ?? 9) - (ORDER[b.status] ?? 9),
  );

  return (
    <Panel
      title={
        <>
          진행 중인 신청
          <PanelCount value={submissions.length} />
        </>
      }
      action={
        <Button variant="link" size="xs" asChild>
          <Link to={to.submissions()}>내 신청 전체 →</Link>
        </Button>
      }
      flush
      bodyClassName="p-0"
    >
      {ordered.length === 0 ? (
        <div className="px-5 py-5">
          <h3 className="text-body font-bold text-ink">
            진행 중인 신청이 없어요
          </h3>
          <p className="mt-1 text-label font-normal text-ink-muted">
            새 공지를 올렸다면 TV에도 걸어 보세요.
          </p>
        </div>
      ) : (
        <ul>
          {ordered.map((submission) => (
            <ActiveSubmissionCard
              key={submission.id}
              submission={submission}
              impressions={impressions.get(submission.id)}
              now={now}
            />
          ))}
        </ul>
      )}
    </Panel>
  );
}

/** "게시 중 1건 · 검토 중 1건 · 고쳐야 할 신청 1건" */
function describe(summary: SubmissionSummary): ReactNode {
  if (summary.total === 0) return "아직 신청한 포스터가 없어요.";
  const { byStatus } = summary;
  const parts = [
    byStatus.PUBLISHED > 0 && `게시 중 ${byStatus.PUBLISHED}건`,
    byStatus.SCHEDULED + byStatus.APPROVED > 0 &&
      `예약 ${byStatus.SCHEDULED + byStatus.APPROVED}건`,
    byStatus.PENDING_REVIEW > 0 && `검토 중 ${byStatus.PENDING_REVIEW}건`,
  ].filter((part): part is string => Boolean(part));
  const needsFix = byStatus.REJECTED + byStatus.SUSPENDED;

  if (parts.length === 0 && needsFix === 0) return "진행 중인 신청이 없어요.";
  return (
    <>
      {parts.join(" · ")}
      {needsFix > 0 && (
        <>
          {parts.length > 0 && " · "}
          <strong className="font-bold text-attention-strong">
            고쳐야 할 신청 {needsFix}건
          </strong>
        </>
      )}
    </>
  );
}
