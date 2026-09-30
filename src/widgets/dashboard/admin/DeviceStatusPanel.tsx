import { Link } from "react-router";
import type { DisplayDevice } from "@/entities/device/model/types";
import { useDevices } from "@/entities/device/api/queries";
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
 * 하우스 관리자는 기기를 고칠 수 없어 운영자에게 알리라고 안내하고, 운영자에게는
 * 기기 관리로 가는 링크를 준다(`manageable`).
 *
 * "N분 전"은 목록과 함께 온 서버 시각으로 센다. 클라이언트 시계로 대신하지 않는다.
 */
export function DeviceStatusPanel({
  manageable = false,
}: {
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
  const offline = items.filter((device) => device.status === "OFFLINE");
  const others = items.filter((device) => device.status !== "OFFLINE");

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
  if (offline.length === 0 && others.every((device) => device.status === "ONLINE")) {
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
        {offline.map((device) => (
          <li
            key={device.id}
            className="rounded-control border border-accent-200 bg-attention-subtle px-3.5 py-3"
          >
            <p className="flex items-baseline justify-between gap-2 text-label">
              <span className="min-w-0 truncate font-bold text-ink">
                {device.name}
              </span>
              <span className="shrink-0 font-bold text-attention-strong">
                {device.lastSeenAt
                  ? `${formatElapsed(device.lastSeenAt, serverTime)}째 끊김`
                  : "연결된 적 없음"}
              </span>
            </p>
            <p className="mt-1 text-caption text-ink-muted">
              {device.lastSeenAt
                ? "마지막으로 받은 편성을 계속 틀고 있어요. "
                : ""}
              {manageable
                ? "전원과 네트워크를 확인해 주세요."
                : "오래 이어지면 운영자에게 알려 주세요."}
            </p>
          </li>
        ))}
        {others.map((device) => (
          <DeviceRow key={device.id} device={device} now={serverTime} />
        ))}
      </ul>
    </Panel>
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
