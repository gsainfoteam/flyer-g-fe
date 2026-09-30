import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useDevices, useTargetGroups } from "@/entities/device/api/queries";
import type { DisplayDevice, TargetGroup } from "@/entities/device/model/types";
import { DeviceStatusBadge } from "@/entities/device/ui/DeviceStatusBadge";
import { LAYOUT_LABELS } from "@/features/devices/model/device-form";
import type { SetupLinkResult } from "@/features/devices/model/setup-link";
import { useRotateDeviceToken } from "@/features/devices/model/use-device-mutations";
import { DeviceFormDialog } from "@/features/devices/ui/DeviceFormDialog";
import { DeviceSetupLinkDialog } from "@/features/devices/ui/DeviceSetupLinkDialog";
import { TargetGroupsSection } from "@/features/devices/ui/TargetGroupsSection";
import { isApiError, toUserMessage } from "@/shared/api/error";
import {
  ConfirmActionDialog,
  EmptyState,
  PageState,
  Panel,
  SectionHeader,
} from "@/shared/components";
import { formatSeoulDate, formatTimeAgo } from "@/shared/lib/datetime";
import { Button } from "@/shared/ui/button";

/**
 * 기기 관리 (`API-CHANGES-BACKEND.md` 11.1). 시스템 운영자만 본다.
 *
 * 로비 TV를 등록하고, 화면 설정(레이아웃·전환 간격·갱신 주기)을 바꾸고, 토큰을
 * 재발급한다. 등록·재발급하면 TV를 연결할 설정 링크를 한 번만 보여준다. 아래에서
 * TV를 묶는 위치 그룹을 관리한다.
 *
 * "마지막 연결 N분 전"은 목록과 함께 온 서버 시각으로 센다.
 */
export function DevicesPage() {
  const devices = useDevices();
  const groups = useTargetGroups();
  const rotate = useRotateDeviceToken();

  const [editing, setEditing] = useState<DisplayDevice | "new" | null>(null);
  const [rotating, setRotating] = useState<DisplayDevice | null>(null);
  const [setupLink, setSetupLink] = useState<SetupLinkResult | null>(null);

  const groupList = groups.data ?? [];

  return (
    <PageState
      isLoading={devices.isPending}
      error={devices.error}
      onRetry={() => void devices.refetch()}
      loadingRows={4}
    >
      {devices.data && (
        <>
          <SectionHeader
            as="h1"
            title={`디스플레이 기기 ${devices.data.items.length}대`}
            description="로비 TV를 등록하고 화면 설정과 연결을 관리해요."
            action={
              <Button size="sm" onClick={() => setEditing("new")}>
                <Plus aria-hidden="true" />
                기기 등록
              </Button>
            }
          />

          <Panel flush>
            {devices.data.items.length === 0 ? (
              <EmptyState
                title="등록된 기기가 없어요"
                description="기기를 등록하면 TV를 연결할 설정 링크를 드려요."
                className="px-5"
              />
            ) : (
              <ul className="flex flex-col divide-y divide-line">
                {devices.data.items.map((device) => (
                  <DeviceRow
                    key={device.id}
                    device={device}
                    groups={groupList}
                    serverNow={devices.data.serverTime}
                    onEdit={() => setEditing(device)}
                    onRotate={() => setRotating(device)}
                  />
                ))}
              </ul>
            )}
          </Panel>

          <TargetGroupsSection
            groups={groups.data}
            isLoading={groups.isPending}
            error={groups.error}
            onRetry={() => void groups.refetch()}
          />
        </>
      )}

      {editing !== null && (
        <DeviceFormDialog
          // 기기마다 새 폼으로 연다. 다른 기기의 입력이 남지 않게.
          key={editing === "new" ? "new" : editing.id}
          open
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
          device={editing === "new" ? null : editing}
          groups={groups.data}
          onCreated={({ device, token }) =>
            setSetupLink({
              deviceId: device.id,
              deviceName: device.name,
              token,
              reason: "created",
            })
          }
        />
      )}

      <ConfirmActionDialog
        open={rotating !== null}
        onOpenChange={(open) => {
          if (!open) setRotating(null);
        }}
        title={`${rotating?.name ?? ""} 토큰을 재발급할까요?`}
        description="지금 연결된 TV는 바로 끊겨요. 새 설정 링크로 TV를 다시 열어야 해요."
        confirmLabel="재발급"
        tone="destructive"
        onConfirm={async () => {
          if (!rotating) return;
          const { device, token } = await rotate.mutateAsync(rotating.id);
          setSetupLink({
            deviceId: device.id,
            deviceName: device.name,
            token,
            reason: "rotated",
          });
        }}
        onError={(error) =>
          toast.error("재발급하지 못했어요", {
            description: isApiError(error)
              ? toUserMessage(error)
              : "잠시 후 다시 시도해 주세요.",
          })
        }
      />

      <DeviceSetupLinkDialog
        result={setupLink}
        onClose={() => setSetupLink(null)}
      />
    </PageState>
  );
}

function groupNamesOf(
  groupIds: readonly string[],
  groups: readonly TargetGroup[],
): string {
  if (groupIds.length === 0) return "위치 그룹 없음";
  const names = groupIds
    .map((id) => groups.find((group) => group.id === id)?.name)
    .filter(Boolean);
  return names.length > 0 ? names.join(", ") : "알 수 없는 그룹";
}

function DeviceRow({
  device,
  groups,
  serverNow,
  onEdit,
  onRotate,
}: {
  device: DisplayDevice;
  groups: readonly TargetGroup[];
  serverNow: Date;
  onEdit: () => void;
  onRotate: () => void;
}) {
  const facts = [
    `${LAYOUT_LABELS[device.layout.type]} · ${device.layout.rotationSeconds}초마다 넘김`,
    `${device.refreshAfterSeconds}초마다 편성 확인`,
    device.lastSeenAt
      ? `마지막 연결 ${formatTimeAgo(device.lastSeenAt, serverNow)}`
      : "아직 연결된 적 없음",
    device.appVersion && `앱 ${device.appVersion}`,
    device.tokenIssuedAt &&
      `토큰 발급 ${formatSeoulDate(device.tokenIssuedAt)}`,
  ].filter(Boolean);

  return (
    <li className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-label font-bold text-ink">
            {device.name}
          </p>
          <DeviceStatusBadge status={device.status} />
        </div>
        <p className="mt-1 truncate text-caption text-ink-muted">
          {[device.location, groupNamesOf(device.groupIds, groups)]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <p className="mt-0.5 text-caption text-ink-subtle">
          {facts.join(" · ")}
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button variant="secondary" size="sm" onClick={onEdit}>
          수정
        </Button>
        <Button variant="outline" size="sm" onClick={onRotate}>
          토큰 재발급
        </Button>
      </div>
    </li>
  );
}
