import { Link } from "react-router";
import { useDevices } from "@/entities/device/api/queries";
import {
  boardRotationOf,
  isRenderStalled,
  isTargetedTo,
} from "@/entities/device/model/board";
import type { DisplayDevice } from "@/entities/device/model/types";
import type { SubmissionView } from "@/entities/submission/model/types";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  Panel,
} from "@/shared/components";
import { to } from "@/shared/config/routes";
import { Button } from "@/shared/ui/button";

/**
 * 게시판 현황. TV마다 지금 몇 장이 돌고, 한 바퀴가 얼마나 걸리고, 포스터 한 장이
 * 얼마나 자주 나오는지.
 *
 * 노출 기록을 모은 값이 아니라 지금 편성으로 계산한 값이다. TV는 포스터를
 * 건너뛰지 않으므로 노출 수는 걸린 시간에 비례할 뿐이고, 운영자가 손쓸 수 있는 건
 * 붐비는 정도다. 한 바퀴가 길어지면 기기 관리에서 4분할로 바꾸거나 전환 간격을
 * 줄인다.
 */
const LAYOUT_LABEL = { SINGLE: "한 장씩", FOUR_GRID: "4분할" } as const;

/** "30초", "1분", "1분 30초" */
function formatSeconds(total: number): string {
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  if (minutes === 0) return `${seconds}초`;
  return seconds === 0 ? `${minutes}분` : `${minutes}분 ${seconds}초`;
}

export function BoardStatusPanel({
  published,
  now,
}: {
  /** 게시 중인 신청 전체 */
  published: SubmissionView[];
  now: Date;
}) {
  const devices = useDevices();
  const active = devices.data?.items.filter(
    (device) => device.status !== "DISABLED",
  );

  return (
    <Panel
      title="게시판 현황"
      action={
        <Button variant="link" size="xs" asChild>
          <Link to={to.displays()}>화면 설정 →</Link>
        </Button>
      }
      flush
      bodyClassName="p-0"
    >
      {devices.isPending ? (
        <LoadingState
          rows={2}
          label="게시판 현황을 불러오고 있어요."
          className="px-5 py-4"
        />
      ) : devices.error ? (
        <ErrorState
          error={devices.error}
          title="게시판 현황을 불러오지 못했어요"
          onRetry={() => void devices.refetch()}
          className="px-5"
        />
      ) : !active || active.length === 0 ? (
        <EmptyState
          title="쓰고 있는 TV가 없어요"
          description="기기를 등록하면 TV별 편성이 여기에 보여요."
          className="px-5"
        />
      ) : (
        <>
          <ul className="flex flex-col divide-y divide-line">
            {active.map((device) => (
              <BoardRow
                key={device.id}
                device={device}
                posters={published.filter((item) =>
                  isTargetedTo(device, item.targetGroupIds),
                )}
                now={now}
              />
            ))}
          </ul>
          <p className="border-t border-line px-5 py-3 text-caption text-ink-subtle">
            현재 편성 기준
          </p>
        </>
      )}
    </Panel>
  );
}

function BoardRow({
  device,
  posters,
  now,
}: {
  device: DisplayDevice;
  posters: SubmissionView[];
  now: Date;
}) {
  const rotation = boardRotationOf(device, posters.length);
  const problem =
    device.status === "OFFLINE"
      ? "연결 끊김"
      : isRenderStalled(device, now, posters.length > 0)
        ? "재생 멈춤"
        : null;

  return (
    <li className="flex flex-wrap items-center gap-x-6 gap-y-1 px-5 py-3.5">
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-label font-bold text-ink">
          <span className="truncate">{device.name}</span>
          {problem && (
            <span className="shrink-0 text-caption font-bold text-attention-strong">
              {problem}
            </span>
          )}
        </p>
        <p className="text-caption text-ink-subtle">
          포스터 {rotation.posterCount}장 · {LAYOUT_LABEL[device.layout.type]} ·{" "}
          {rotation.rotationSeconds}초마다 넘김
        </p>
      </div>
      <div className="text-right max-sm:basis-full max-sm:text-left">
        {rotation.posterCount === 0 ? (
          <>
            <p className="text-label font-bold text-ink">안내 화면</p>
            <p className="text-caption text-ink-subtle">걸린 포스터 없음</p>
          </>
        ) : rotation.cycleSeconds === null ? (
          <>
            <p className="text-label font-bold text-ink">넘기지 않음</p>
            <p className="text-caption text-ink-subtle">한 화면에 모두 표시</p>
          </>
        ) : (
          <>
            <p className="text-label font-bold text-ink tabular-nums">
              한 바퀴 {formatSeconds(rotation.cycleSeconds)}
            </p>
            <p className="text-caption text-ink-subtle tabular-nums">
              포스터당 시간당 약 {rotation.timesPerHour}회
            </p>
          </>
        )}
      </div>
    </li>
  );
}
