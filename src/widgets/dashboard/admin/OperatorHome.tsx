import type { ReactNode } from "react";
import { useDevices } from "@/entities/device/api/queries";
import { PageState } from "@/shared/components";
import { formatElapsed } from "@/shared/lib/datetime";
import { DashboardColumns } from "../DashboardColumns";
import { DashboardHeader } from "../DashboardHeader";
import { DeviceStatusPanel } from "./DeviceStatusPanel";
import { ImpressionStatsPanel } from "./ImpressionStatsPanel";
import { OnAirPanel } from "./OnAirPanel";
import { RecentDecisionsPanel } from "./RecentDecisionsPanel";
import { QueueAction } from "./ReviewerHome";
import { ReviewQueuePanel } from "./ReviewQueuePanel";
import { TodayChangesPanel } from "./TodayChangesPanel";
import { useAdminHome } from "./use-admin-home";

/**
 * 운영자 홈. 운영자는 하우스 관리자의 권한을 모두 가지므로 하우스 관리자 홈의 칸을
 * 모두 두고, 운영자만의 것(기기 관리, 노출 통계)을 더한다.
 *
 * 제목은 지금 해야 할 두 가지 — 검토 대기와 끊긴 TV — 를 한 줄로 말한다.
 * 노출 통계는 표가 필요해 넓은 왼쪽 칸에 두고, 지금 게시 중은 오른쪽에 짧게 둔다.
 */
const ON_AIR_LIMIT = 5;
const DECISION_LIMIT = 4;

export function OperatorHome() {
  const { ready, isLoading, error, retry } = useAdminHome();
  const devices = useDevices();
  const offline =
    devices.data?.items.filter((device) => device.status === "OFFLINE")
      .length ?? 0;

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
            title={titleOf(ready.summary.pendingReview, offline)}
            description={
              ready.oldest
                ? `가장 오래된 신청은 ${formatElapsed(
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
                <ImpressionStatsPanel now={ready.now} />
                <RecentDecisionsPanel
                  limit={DECISION_LIMIT}
                  now={ready.now}
                  wide
                />
              </>
            }
            side={
              <>
                <DeviceStatusPanel manageable />
                <TodayChangesPanel submissions={ready.board} now={ready.now} />
                <OnAirPanel
                  submissions={ready.published}
                  now={ready.now}
                  limit={ON_AIR_LIMIT}
                  compact
                />
              </>
            }
          />
        </>
      )}
    </PageState>
  );
}

const accent = (value: string) => (
  <span className="text-accent">{value}</span>
);

function titleOf(pending: number, offline: number): ReactNode {
  if (pending > 0 && offline > 0) {
    return (
      <>
        검토 대기 {accent(`${pending}건`)} · 연결 끊긴 TV {accent(`${offline}대`)}
      </>
    );
  }
  if (pending > 0) return <>검토를 기다리는 신청 {accent(`${pending}건`)}</>;
  if (offline > 0) return <>연결 끊긴 TV {accent(`${offline}대`)}</>;
  return "지금 처리할 일이 없어요";
}
