import type { DisplayDevice } from "@/entities/device/model/types";
import { useDevices } from "@/entities/device/api/queries";
import { DeviceStatusBadge } from "@/entities/device/ui/DeviceStatusBadge";
import { ErrorState, LoadingState, Panel } from "@/shared/components";
import { formatTimeAgo } from "@/shared/lib/datetime";

/**
 * 로비 TV의 연결 상태 (명세 FR-DASH-03).
 *
 * 기기가 보낸 마지막 heartbeat로 판단한다. 오프라인이어도 TV는 마지막으로 받은
 * 편성을 계속 재생하므로, 관리자가 당장 해야 할 일은 없다는 것을 함께 알린다.
 * "N분 전"은 목록과 함께 온 서버 시각으로 센다. 클라이언트 시계로 대신하지 않는다.
 */
export function DeviceStatusPanel() {
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
          now={devices.data.serverTime}
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
              <DeviceStatusBadge status={device.status} />
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
