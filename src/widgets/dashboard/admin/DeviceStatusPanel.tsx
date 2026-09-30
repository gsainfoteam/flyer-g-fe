import { Link } from "react-router";
import type { DisplayDevice } from "@/entities/device/model/types";
import { useDevices } from "@/entities/device/api/queries";
import { isRenderStalled, isTargetedTo } from "@/entities/device/model/board";
import type { SubmissionView } from "@/entities/submission/model/types";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  Panel,
} from "@/shared/components";
import { to } from "@/shared/config/routes";
import { formatElapsed, formatTimeAgo } from "@/shared/lib/datetime";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { PanelCount } from "../DashboardColumns";

/**
 * 로비 TV의 연결 상태.
 *
 * 기기가 보낸 마지막 heartbeat로 서버가 판단한다. 모두 정상이면 한 줄로 접고, 끊긴
 * 기기가 있으면 그 기기를 맨 위에 경고로 펼친다. 끊겨도 TV는 마지막으로 받은 편성을
 * 계속 틀기 때문에, 급한 일인지 아닌지를 함께 알린다.
 *
 * 연결은 살아 있어도 포스터를 오래 못 띄우고 있으면(재생 멈춤) 같은 자리에 알린다.
 * 연결 여부만 보면 화면이 멈춘 TV를 정상으로 오해한다.
 *
 * 하우스 관리자는 기기를 고칠 수 없어 운영자에게 알리라고 안내하고, 운영자에게는
 * 기기 관리로 가는 링크를 준다(`manageable`).
 *
 * "N분 전"은 목록과 함께 온 서버 시각으로 센다. 클라이언트 시계로 대신하지 않는다.
 */
export function DeviceStatusPanel({
  published,
  manageable = false,
}: {
  /** 게시 중인 신청. 띄울 포스터가 있는 TV만 재생 멈춤을 따진다. */
  published: SubmissionView[];
  manageable?: boolean;
}) {
  const devices = useDevices();
  const manageLink = manageable && (
    <Button variant="link" size="xs" asChild>
      <Link to={to.displays()}>기기 관리 →</Link>
    </Button>
  );

  if (devices.isPending || devices.error) {
    return (
      <Panel title="디스플레이" action={manageLink}>
        {devices.isPending ? (
          <LoadingState rows={2} label="기기 상태를 불러오고 있어요." />
        ) : (
          <ErrorState
            error={devices.error}
            title="기기 상태를 불러오지 못했어요"
            onRetry={() => void devices.refetch()}
            className="py-0"
          />
        )}
      </Panel>
    );
  }

  const { items, serverTime } = devices.data;
  const stalled = (device: DisplayDevice) =>
    isRenderStalled(
      device,
      serverTime,
      published.some((item) => isTargetedTo(device, item.targetGroupIds)),
    );
  const troubled = items.filter(
    (device) => device.status === "OFFLINE" || stalled(device),
  );
  const others = items.filter((device) => !troubled.includes(device));

  if (items.length === 0) {
    return (
      <Panel title="디스플레이" action={manageLink}>
        <EmptyState
          title="등록된 기기가 없어요"
          description={
            manageable
              ? "기기를 등록하면 TV에 연결할 설정 링크를 드려요."
              : "운영자가 기기를 등록하면 연결 상태가 여기에 보여요."
          }
          action={
            manageable && (
              <Button variant="secondary" size="sm" asChild>
                <Link to={to.displays()}>기기 등록</Link>
              </Button>
            )
          }
          className="py-1"
        />
      </Panel>
    );
  }

  // 모두 정상이면 한 줄로 접는다.
  if (
    troubled.length === 0 &&
    others.every((device) => device.status === "ONLINE")
  ) {
    return (
      <section
        aria-label="디스플레이"
        className="flex items-center gap-2.5 rounded-card border border-line bg-surface px-5 py-3.5 shadow-card"
      >
        <span aria-hidden="true" className="size-2 rounded-pill bg-success" />
        <h2 className="min-w-0 flex-1 text-label font-semibold text-ink">
          디스플레이 {items.length}대 모두 정상
        </h2>
        {manageLink}
      </section>
    );
  }

  return (
    <Panel
      title={
        <>
          디스플레이
          <PanelCount value={items.length} />
        </>
      }
      action={manageLink}
    >
      <ul className="flex flex-col gap-3.5">
        {troubled.map((device) => (
          <TroubleRow
            key={device.id}
            device={device}
            now={serverTime}
            manageable={manageable}
          />
        ))}
        {others.map((device) => (
          <DeviceRow key={device.id} device={device} now={serverTime} />
        ))}
      </ul>
    </Panel>
  );
}

/** 끊겼거나 재생이 멈춘 TV. 무엇이 문제이고 누가 무엇을 하면 되는지 적는다. */
function TroubleRow({
  device,
  now,
  manageable,
}: {
  device: DisplayDevice;
  now: Date;
  manageable: boolean;
}) {
  const offline = device.status === "OFFLINE";
  const label = offline
    ? device.lastSeenAt
      ? `${formatElapsed(device.lastSeenAt, now)}째 끊김`
      : "연결된 적 없음"
    : `${formatElapsed(device.lastRenderOkAt!, now)}째 재생 멈춤`;
  const cause = offline
    ? device.lastSeenAt
      ? "마지막으로 받은 편성을 계속 틀고 있어요. "
      : ""
    : "연결은 되어 있지만 포스터를 띄우지 못하고 있어요. ";
  const next = manageable
    ? offline
      ? "전원과 네트워크를 확인해 주세요."
      : "TV 화면을 확인하고 다시 켜 보세요."
    : "오래 이어지면 운영자에게 알려 주세요.";

  return (
    <li className="rounded-control border border-accent-200 bg-attention-subtle px-3.5 py-3">
      <p className="flex items-baseline justify-between gap-2 text-label">
        <span className="min-w-0 truncate font-bold text-ink">
          {device.name}
        </span>
        <span className="shrink-0 font-bold text-attention-strong">
          {label}
        </span>
      </p>
      <p className="mt-1 text-caption text-ink-muted">
        {cause}
        {next}
      </p>
    </li>
  );
}

function DeviceRow({ device, now }: { device: DisplayDevice; now: Date }) {
  const online = device.status === "ONLINE";
  return (
    <li className="flex items-center gap-2.5 px-0.5 text-label">
      <span
        aria-hidden="true"
        className={cn(
          "size-2 shrink-0 rounded-pill",
          online ? "bg-success" : "bg-ink-subtle",
        )}
      />
      <span className="min-w-0 flex-1 truncate font-semibold text-ink">
        {device.name}
      </span>
      <span className="shrink-0 text-caption text-ink-subtle">
        {online
          ? device.lastSeenAt
            ? `정상 · ${formatTimeAgo(device.lastSeenAt, now)}`
            : "정상"
          : "사용 안 함"}
      </span>
    </li>
  );
}
