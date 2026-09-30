import type { ReactNode } from "react";
import { useDevices } from "@/entities/device/api/queries";
import { isRenderStalled, isTargetedTo } from "@/entities/device/model/board";
import { PageState } from "@/shared/components";
import { formatElapsed } from "@/shared/lib/datetime";
import { DashboardColumns } from "../DashboardColumns";
import { DashboardHeader } from "../DashboardHeader";
import { DeviceStatusPanel } from "./DeviceStatusPanel";
import { BoardStatusPanel } from "./BoardStatusPanel";
import { OnAirPanel } from "./OnAirPanel";
import { RecentDecisionsPanel } from "./RecentDecisionsPanel";
import { QueueAction } from "./ReviewerHome";
import { ReviewQueuePanel } from "./ReviewQueuePanel";
import { TodayChangesPanel } from "./TodayChangesPanel";
import { useAdminHome } from "./use-admin-home";

/**
 * 운영자 홈. 운영자는 하우스 관리자의 권한을 모두 가지므로 하우스 관리자 홈의 칸을
 * 모두 두고, 운영자만의 것(기기 관리, 게시판 현황)을 더한다.
 *
 * 제목은 지금 해야 할 두 가지 — 검토 대기와 손봐야 할 TV — 를 한 줄로 말한다.
 * 게시판 현황은 TV마다 한 줄씩이라 넓은 왼쪽 칸에 두고, 지금 게시 중은 오른쪽에
 * 짧게 둔다.
 */
const ON_AIR_LIMIT = 5;
const DECISION_LIMIT = 4;

export function OperatorHome() {
  const { ready, isLoading, error, retry } = useAdminHome();
  const devices = useDevices();
  const offline =
    devices.data?.items.filter((device) => device.status === "OFFLINE")
      .length ?? 0;
  const stalled =
    devices.data && ready
      ? devices.data.items.filter((device) =>
          isRenderStalled(
            device,
            devices.data.serverTime,
            ready.published.some((item) =>
              isTargetedTo(device, item.targetGroupIds),
            ),
          ),
        ).length
      : 0;

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
            title={titleOf(ready.summary.pendingReview, offline, stalled)}
            description={
              ready.oldest
                ? `가장 오래된 신청 ${formatElapsed(
                    ready.oldest.submittedAt ?? ready.oldest.createdAt,
                    ready.now,
                  )}째 대기`
                : `게시 중 ${ready.published.length}장`
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
                <BoardStatusPanel published={ready.published} now={ready.now} />
                <RecentDecisionsPanel
                  limit={DECISION_LIMIT}
                  now={ready.now}
                  wide
                />
              </>
            }
            side={
              <>
                <DeviceStatusPanel published={ready.published} manageable />
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

/**
 * 끊긴 TV만 있으면 "연결 끊긴 TV", 재생이 멈춘 TV도 있으면 둘을 묶어
 * "확인할 TV"라고 부른다.
 */
function titleOf(pending: number, offline: number, stalled: number): ReactNode {
  const troubled = offline + stalled;
  const tv =
    troubled > 0 && (
      <>
        {stalled > 0 ? "확인할 TV" : "연결 끊긴 TV"} {accent(`${troubled}대`)}
      </>
    );
  if (pending > 0 && tv) {
    return (
      <>
        검토 대기 {accent(`${pending}건`)} · {tv}
      </>
    );
  }
  if (pending > 0) return <>검토를 기다리는 신청 {accent(`${pending}건`)}</>;
  if (tv) return tv;
  return "지금 처리할 일이 없어요";
}
