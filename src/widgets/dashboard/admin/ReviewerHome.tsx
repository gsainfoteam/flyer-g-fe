import { Link } from "react-router";
import { PageState } from "@/shared/components";
import { to } from "@/shared/config/routes";
import { formatElapsed } from "@/shared/lib/datetime";
import { Button } from "@/shared/ui/button";
import { DashboardColumns } from "../DashboardColumns";
import { DashboardHeader } from "../DashboardHeader";
import { DeviceStatusPanel } from "./DeviceStatusPanel";
import { OnAirPanel } from "./OnAirPanel";
import { RecentDecisionsPanel } from "./RecentDecisionsPanel";
import { ReviewQueuePanel } from "./ReviewQueuePanel";
import { TodayChangesPanel } from "./TodayChangesPanel";
import { useAdminHome } from "./use-admin-home";

/**
 * 하우스 관리자 홈. 포스터 검토가 일이다.
 *
 * 왼쪽에 처리할 신청과 지금 걸린 포스터를, 오른쪽에 곁눈으로 볼 상태(기기, 오늘
 * 바뀌는 것, 다른 관리자의 최근 처리)를 둔다. 기기는 고칠 수 없지만 끊겼는지는 안다.
 */
const ON_AIR_LIMIT = 5;
const DECISION_LIMIT = 3;

export function ReviewerHome() {
  const { ready, isLoading, error, retry } = useAdminHome();

  return (
    <PageState
      isLoading={isLoading}
      error={error}
      onRetry={retry}
      loadingRows={5}
    >
      {ready && (
        <>
          <DashboardHeader
            title={
              ready.summary.pendingReview > 0 ? (
                <>
                  검토를 기다리는 신청{" "}
                  <span className="text-accent">
                    {ready.summary.pendingReview}건
                  </span>
                </>
              ) : (
                "지금 처리할 신청이 없어요"
              )
            }
            description={
              ready.oldest
                ? `가장 오래된 건 ${formatElapsed(
                    ready.oldest.submittedAt ?? ready.oldest.createdAt,
                    ready.now,
                  )}째 기다리고 있어요.`
                : `포스터 ${ready.published.length}장이 게시 중이에요.`
            }
            action={<QueueAction oldestId={ready.oldest?.id} />}
          />
          <DashboardColumns
            main={
              <>
                <ReviewQueuePanel
                  submissions={ready.pending.items}
                  totalCount={ready.summary.pendingReview}
                  now={ready.now}
                />
                <OnAirPanel
                  submissions={ready.published}
                  now={ready.now}
                  limit={ON_AIR_LIMIT}
                />
              </>
            }
            side={
              <>
                <DeviceStatusPanel />
                <TodayChangesPanel submissions={ready.board} now={ready.now} />
                <RecentDecisionsPanel limit={DECISION_LIMIT} now={ready.now} />
              </>
            }
          />
        </>
      )}
    </PageState>
  );
}

/**
 * 검토할 건이 있으면 가장 오래 기다린 건부터 연다. 결정하면 다음 건으로 이어진다.
 * 없으면 전체 신청 목록으로 간다.
 */
export function QueueAction({ oldestId }: { oldestId: string | undefined }) {
  return oldestId ? (
    <Button asChild>
      <Link to={to.reviewDetail(oldestId)}>순서대로 검토 시작</Link>
    </Button>
  ) : (
    <Button variant="secondary" asChild>
      <Link to={to.submissions(undefined, { scope: "all" })}>
        전체 신청 보기
      </Link>
    </Button>
  );
}
