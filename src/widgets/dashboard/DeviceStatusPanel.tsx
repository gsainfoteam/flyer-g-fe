import type {
  DeviceStatus,
  DisplayDevice,
} from "@/entities/device/model/types";
import { useDevices } from "@/entities/device/api/queries";
import { ErrorState, LoadingState, Panel } from "@/shared/components";
import { formatTimeAgo } from "@/shared/lib/datetime";
import { cn } from "@/shared/lib/utils";

/**
 * 로비 TV의 연결 상태 (명세 FR-DASH-03).
 *
 * 기기가 보낸 마지막 heartbeat로 판단한다. 오프라인이어도 TV는 마지막으로 받은
 * 편성을 계속 재생하므로, 관리자가 당장 해야 할 일은 없다는 것을 함께 알린다.
 */
const STATUS_STYLE: Record<
  DeviceStatus,
  { label: string; pill: string; dot: string }
> = {
  ONLINE: {
    label: "온라인",
    pill: "bg-success-subtle text-success-strong",
    dot: "bg-success",
  },
  OFFLINE: {
    label: "오프라인",
    pill: "bg-attention-subtle text-attention-strong",
    dot: "bg-attention",
  },
  DISABLED: {
    label: "사용 안 함",
    pill: "bg-surface-muted text-ink-muted",
    dot: "bg-ink-subtle",
  },
};

interface DeviceStatusPanelProps {
  /**
   * 기기 목록에 서버 시각이 없을 때 쓸 서버 시각. 대시보드는 요약의 기준 시각을 넘긴다.
   * 클라이언트 시계로 대신하지 않는다.
   */
  serverNow: Date;
}

export function DeviceStatusPanel({ serverNow }: DeviceStatusPanelProps) {
  const devices = useDevices();

  return (
    <Panel
      title={
        devices.data
          ? `디스플레이 ${devices.data.items.length}대`
          : "디스플레이"
      }
    >
      {devices.isPending ? (
        <LoadingState rows={2} label="기기 상태를 불러오고 있어요." />
      ) : devices.error ? (
        <ErrorState
          error={devices.error}
          title="기기 상태를 불러오지 못했어요"
          onRetry={() => void devices.refetch()}
          className="py-0"
        />
      ) : (
        <DeviceRows
          devices={devices.data.items}
          now={devices.data.serverTime ?? serverNow}
        />
      )}
    </Panel>
  );
}

function DeviceRows({ devices, now }: { devices: DisplayDevice[]; now: Date }) {
  if (devices.length === 0) {
    return <p className="text-body text-ink-muted">등록된 기기가 없어요.</p>;
  }

  const hasOffline = devices.some((device) => device.status === "OFFLINE");

  return (
    <>
      <ul className="flex flex-col gap-3.5 text-body">
        {devices.map((device) => {
          const style = STATUS_STYLE[device.status];
          return (
            <li key={device.id} className="flex items-center gap-2.5">
              <span className="min-w-0 flex-1 truncate font-semibold">
                {device.name}
              </span>
              {device.lastSeenAt && (
                <span className="text-label text-ink-muted">
                  {formatTimeAgo(device.lastSeenAt, now)}
                </span>
              )}
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-overline",
                  style.pill,
                )}
              >
                <span
                  className={cn("size-1.5 rounded-pill", style.dot)}
                  aria-hidden="true"
                />
                {style.label}
              </span>
            </li>
          );
        })}
      </ul>
      {hasOffline && (
        <p className="mt-4 text-caption text-ink-subtle">
          오프라인 기기는 마지막으로 받은 편성을 계속 재생해요.
        </p>
      )}
    </>
  );
}
