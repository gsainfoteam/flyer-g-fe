import { useState } from "react";
import { Link } from "react-router";
import type { ReactNode } from "react";
import {
  CalendarClock,
  ChevronDown,
  KeyRound,
  LayoutGrid,
  ListVideo,
  MoreHorizontal,
  Pencil,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { useDevices, useTargetGroups } from "@/entities/device/api/queries";
import type { DisplayDevice, TargetGroup } from "@/entities/device/model/types";
import { isTargetedTo } from "@/entities/device/model/board";
import { DeviceScreen } from "@/entities/device/ui/DeviceScreen";
import { DeviceStatusBadge } from "@/entities/device/ui/DeviceStatusBadge";
import { LAYOUT_LABELS } from "@/entities/playlist/model/rotation";
import type { SetupLinkResult } from "@/features/devices/model/setup-link";
import { useRotateDeviceToken } from "@/features/devices/model/use-device-mutations";
import { DeviceFormDialog } from "@/features/devices/ui/DeviceFormDialog";
import { DeviceSetupLinkDialog } from "@/features/devices/ui/DeviceSetupLinkDialog";
import { TargetGroupsSection } from "@/features/devices/ui/TargetGroupsSection";
import { TimeSlotsDialog } from "@/features/devices/ui/TimeSlotsDialog";
import { WidgetSettingsDialog } from "@/features/devices/ui/WidgetSettingsDialog";
import { isApiError, toUserMessage } from "@/shared/api/error";
import {
  ConfirmActionDialog,
  EmptyState,
  PageState,
  Panel,
  SectionHeader,
} from "@/shared/components";
import { formatSeoulDate, formatTimeAgo } from "@/shared/lib/datetime";
import { to } from "@/shared/config/routes";
import { useSubmissionViews } from "@/features/submissions/api/queries";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";

/**
 * 기기 관리 (`API-CHANGES-BACKEND.md` 11.1). 시스템 운영자만 본다.
 *
 * TV마다 작은 화면(`DeviceScreen`, 운영자 홈과 같은 모양) 카드로 보여 준다. 자주 하는
 * 일인 "편성"만 크게 두고 수정·위젯·토큰 재발급은 더보기 메뉴에, 설정 값은 접힌 세부
 * 정보에 둔다. 등록·재발급하면 TV를 연결할 설정 링크를 한 번만 보여준다. 아래에서 TV를
 * 묶는 위치 그룹을 관리한다.
 *
 * "마지막 연결 N분 전"은 목록과 함께 온 서버 시각으로 센다.
 */
export function DevicesPage() {
  const devices = useDevices();
  const groups = useTargetGroups();
  const rotate = useRotateDeviceToken();
  // TV 화면에 걸린 포스터 수를 그린다. 운영자 홈 "TV 지금"과 같은 기준이다.
  const publishedQuery = useSubmissionViews({
    statuses: ["PUBLISHED"],
    scope: "all",
    limit: 100,
  });
  const published = publishedQuery.data?.items ?? [];

  const [editing, setEditing] = useState<DisplayDevice | "new" | null>(null);
  const [rotating, setRotating] = useState<DisplayDevice | null>(null);
  const [widgetsOf, setWidgetsOf] = useState<DisplayDevice | null>(null);
  const [setupLink, setSetupLink] = useState<SetupLinkResult | null>(null);
  const [editingSlots, setEditingSlots] = useState(false);

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
            title={`로비 TV ${devices.data.items.length}대`}
            description="TV 등록, 편성, 화면·연결 설정"
            // 좁은 화면에서는 버튼을 제목 아래로 내려 제목이 한 줄에 들어가게 한다.
            className="flex-wrap"
            action={
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => setEditingSlots(true)}>
                  <CalendarClock aria-hidden="true" />
                  시간대 고정
                </Button>
                <Button size="sm" onClick={() => setEditing("new")}>
                  <Plus aria-hidden="true" />
                  기기 등록
                </Button>
              </div>
            }
          />

          {devices.data.items.length === 0 ? (
            <Panel>
              <EmptyState
                title="등록된 TV 없음"
                description="TV를 등록하면 연결용 설정 링크가 발급됩니다."
              />
            </Panel>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {devices.data.items.map((device) => {
                const programGroup = groupList.find(
                  (group) => group.id === device.programGroupId,
                );
                return (
                  <DeviceCard
                    key={device.id}
                    device={device}
                    groups={groupList}
                    posters={
                      published.filter((item) =>
                        isTargetedTo(device, item.targetGroupIds),
                      ).length
                    }
                    serverNow={devices.data.serverTime}
                    onEdit={() => setEditing(device)}
                    onRotate={() => setRotating(device)}
                    onWidgets={() => setWidgetsOf(device)}
                    lineupHref={
                      programGroup ? to.tvLineup(programGroup.id) : undefined
                    }
                  />
                );
              })}
            </ul>
          )}

          <TargetGroupsSection
            lineupHrefOf={(group) => to.tvLineup(group.id)}
            groups={groups.data}
            isLoading={groups.isPending}
            error={groups.error}
            onRetry={() => void groups.refetch()}
          />
        </>
      )}


      {editingSlots && devices.data && (
        <TimeSlotsDialog
          devices={devices.data.items}
          onClose={() => setEditingSlots(false)}
        />
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
        title={`${rotating?.name ?? ""} 토큰을 재발급하시겠습니까?`}
        description="현재 TV 연결이 즉시 해제됩니다. 새 설정 링크로 TV를 다시 연결해야 합니다."
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
          toast.error("재발급하지 못했습니다", {
            description: isApiError(error)
              ? toUserMessage(error)
              : "잠시 후 다시 시도하세요.",
          })
        }
      />

      {widgetsOf && (
        <WidgetSettingsDialog
          key={widgetsOf.id}
          device={widgetsOf}
          onClose={() => setWidgetsOf(null)}
        />
      )}

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

function DeviceCard({
  device,
  groups,
  posters,
  serverNow,
  onEdit,
  onRotate,
  onWidgets,
  lineupHref,
}: {
  device: DisplayDevice;
  groups: readonly TargetGroup[];
  posters: number;
  serverNow: Date;
  onEdit: () => void;
  onRotate: () => void;
  onWidgets: () => void;
  /** 편성 화면 주소. 편성 그룹이 없으면 비운다. */
  lineupHref?: string;
}) {
  const lastSeen = device.lastSeenAt
    ? `마지막 연결 ${formatTimeAgo(device.lastSeenAt, serverNow)}`
    : "아직 연결된 적 없음";

  return (
    <li className="flex min-w-0 flex-col rounded-block bg-surface p-3 ring-1 ring-line">
      <DeviceScreen device={device} posters={posters} now={serverNow} />

      <div className="flex flex-1 flex-col px-1.5 pt-3">
        <div className="flex items-center gap-2">
          <h2 className="min-w-0 truncate text-subhead text-ink">
            {device.name}
          </h2>
          <DeviceStatusBadge status={device.status} className="ml-auto" />
        </div>
        <p className="mt-1 truncate text-caption text-ink-muted">
          {[device.location, groupNamesOf(device.groupIds, groups)]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <p className="text-caption text-ink-subtle">{lastSeen}</p>

        {/* 자주 보지 않는 설정 값은 접어 둔다. */}
        <details className="group mt-2.5">
          <summary className="inline-flex cursor-pointer list-none items-center gap-0.5 rounded-control text-caption font-semibold text-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus [&::-webkit-details-marker]:hidden">
            세부 정보
            <ChevronDown
              size={14}
              aria-hidden="true"
              className="transition-transform group-open:rotate-180"
            />
          </summary>
          <dl className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 rounded-tile bg-surface-muted px-3 py-2.5 text-caption">
            <Fact label="화면">
              {LAYOUT_LABELS[device.layout.type]} · 포스터{" "}
              {device.layout.rotationSeconds}초마다 넘김
            </Fact>
            <Fact label="편성 확인">{device.refreshAfterSeconds}초마다</Fact>
            {device.appVersion && <Fact label="앱">{device.appVersion}</Fact>}
            {device.tokenIssuedAt && (
              <Fact label="토큰 발급">
                {formatSeoulDate(device.tokenIssuedAt)}
              </Fact>
            )}
          </dl>
        </details>

        <div className="mt-auto flex items-center gap-2 pt-3.5">
          {lineupHref ? (
            <Button
              size="sm"
              variant="secondary"
              asChild
              className="flex-1 bg-ink text-ink-inverse hover:bg-ink/90 active:bg-ink/80"
            >
              <Link to={lineupHref}>
                <ListVideo aria-hidden="true" />
                편성
              </Link>
            </Button>
          ) : (
            <p className="flex-1 text-caption text-ink-subtle">
              편성 그룹 없음
            </p>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="secondary"
                size="icon-sm"
                aria-label={`${device.name} 더보기`}
              >
                <MoreHorizontal aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-40">
              <DropdownMenuItem onSelect={onEdit}>
                <Pencil aria-hidden="true" />
                수정
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onWidgets}>
                <LayoutGrid aria-hidden="true" />
                위젯
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={onRotate}>
                <KeyRound aria-hidden="true" />
                토큰 재발급
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </li>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-ink-subtle">{label}</dt>
      <dd className="min-w-0 text-ink">{children}</dd>
    </>
  );
}
