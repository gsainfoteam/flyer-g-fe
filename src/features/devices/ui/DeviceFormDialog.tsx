import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  DEVICE_LIMITS,
  selectableTargetGroups,
} from "@/entities/device/model/types";
import type {
  DeviceWithToken,
  DisplayDevice,
  TargetGroup,
} from "@/entities/device/model/types";
import { LAYOUT_TYPES } from "@/entities/playlist/model/types";
import { isApiError, toUserMessage } from "@/shared/api/error";
import { queryKeys } from "@/shared/api/query-keys";
import { ConfirmActionDialog, FormField } from "@/shared/components";
import { Input } from "@/shared/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import {
  LAYOUT_LABELS,
  createEmptyDeviceDraft,
  draftFromDevice,
  toDeviceFieldErrors,
  toDeviceInput,
  toUpdateDeviceInput,
  validateDeviceDraft,
} from "../model/device-form";
import type { DeviceDraft, DeviceFieldErrors } from "../model/device-form";
import {
  useCreateDevice,
  useUpdateDevice,
} from "../model/use-device-mutations";

/**
 * 기기 등록·수정 (`API-CHANGES-BACKEND.md` 11.1).
 *
 * 등록하면 서버가 토큰을 한 번만 준다. 호출부가 받아 설정 링크로 보여준다.
 * 수정에서는 "사용 안 함"으로 바꿀 수 있다. 사용 안 함인 기기는 토큰이 있어도
 * 편성을 받지 못한다.
 *
 * 숨긴 위치 그룹은 고를 수 없다. 이 기기에 이미 연결된 숨긴 그룹만 남겨 풀 수 있게
 * 한다(서버도 그대로 두는 것은 허용한다).
 */
interface DeviceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 없으면 등록, 있으면 그 기기를 수정한다. */
  device: DisplayDevice | null;
  groups: readonly TargetGroup[];
  onCreated: (result: DeviceWithToken) => void;
}

/** 폼 칸을 다 채우지 않았을 때 확인 버튼이 창을 닫지 않게 던진다. */
class IncompleteForm extends Error {}

export function DeviceFormDialog({
  open,
  onOpenChange,
  device,
  groups,
  onCreated,
}: DeviceFormDialogProps) {
  const [draft, setDraft] = useState<DeviceDraft>(() =>
    device ? draftFromDevice(device) : createEmptyDeviceDraft(),
  );
  const [showErrors, setShowErrors] = useState(false);
  const [serverErrors, setServerErrors] = useState<DeviceFieldErrors>({});
  const create = useCreateDevice();
  const update = useUpdateDevice(device?.id ?? "");
  const queryClient = useQueryClient();
  const choices = selectableTargetGroups(groups, device?.groupIds);

  const errors = { ...validateDeviceDraft(draft), ...serverErrors };
  const errorOf = (field: keyof DeviceFieldErrors) =>
    showErrors ? (errors[field] ?? null) : null;

  const patch = (next: Partial<DeviceDraft>) => {
    setDraft((current) => ({ ...current, ...next }));
    setServerErrors({});
  };

  const toggleGroup = (groupId: string) =>
    patch({
      groupIds: draft.groupIds.includes(groupId)
        ? draft.groupIds.filter((id) => id !== groupId)
        : [...draft.groupIds, groupId],
    });

  return (
    <ConfirmActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title={device ? `${device.name} 수정` : "기기 등록"}
      description={
        device
          ? "화면 설정은 다음 편성 갱신 때 TV에 반영돼요."
          : "등록하면 이 TV를 연결할 설정 링크를 한 번만 보여드려요."
      }
      confirmLabel={device ? "저장" : "등록"}
      onConfirm={async () => {
        setShowErrors(true);
        if (Object.keys(validateDeviceDraft(draft)).length > 0) {
          throw new IncompleteForm();
        }
        // 고른 뒤 다른 운영자가 숨긴 그룹은 목록에서 사라지니 보내지 않는다.
        // 모르는 id(목록을 못 받았거나 지운 그룹)는 서버가 판단하게 둔다.
        const sent = {
          ...draft,
          groupIds: draft.groupIds.filter(
            (id) =>
              choices.some((group) => group.id === id) ||
              !groups.some((group) => group.id === id),
          ),
        };
        if (device) {
          await update.mutateAsync(toUpdateDeviceInput(sent));
          toast.success("기기 설정을 저장했어요");
        } else {
          onCreated(await create.mutateAsync(toDeviceInput(sent)));
        }
      }}
      onError={(error) => {
        if (error instanceof IncompleteForm) return;
        if (isApiError(error)) {
          const fieldErrors = toDeviceFieldErrors(error.fields);
          if (fieldErrors.groupIds) {
            // 서버 문구에는 그룹 id가 들어 있다. 사람이 읽을 말로 바꾸고 목록을 새로 받는다.
            fieldErrors.groupIds =
              "숨겼거나 지운 그룹이 섞여 있어요. 그룹 목록을 새로 받았으니 다시 골라 주세요.";
            void queryClient.invalidateQueries({
              queryKey: queryKeys.reference.targetGroups(),
            });
          }
          setServerErrors(fieldErrors);
        }
        toast.error(device ? "저장하지 못했어요" : "등록하지 못했어요", {
          description: isApiError(error)
            ? toUserMessage(error)
            : "잠시 후 다시 시도해 주세요.",
        });
      }}
    >
      <div className="space-y-4">
        <FormField label="기기 이름" required error={errorOf("name")}>
          {(control) => (
            <Input
              {...control}
              value={draft.name}
              maxLength={DEVICE_LIMITS.nameMaxLength * 2}
              placeholder="예: A동 로비"
              onChange={(event) => patch({ name: event.target.value })}
            />
          )}
        </FormField>

        <FormField label="설치 위치" error={errorOf("location")}>
          {(control) => (
            <Input
              {...control}
              value={draft.location}
              maxLength={DEVICE_LIMITS.locationMaxLength * 2}
              placeholder="예: 학사기숙사 A동 1층"
              onChange={(event) => patch({ location: event.target.value })}
            />
          )}
        </FormField>

        <fieldset className="space-y-1.5">
          <legend className="text-label text-ink">위치 그룹</legend>
          <p className="text-caption text-ink-muted">
            신청자가 대상 위치로 이 그룹을 고르면 이 TV에 나가요. 대상을 고르지
            않은 신청은 모든 TV에 나가요.
          </p>
          {choices.length === 0 ? (
            <p className="text-caption text-ink-subtle">
              고를 수 있는 위치 그룹이 없어요. 기기 목록 아래 위치 그룹에서
              추가해 주세요.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2 pt-1">
              {choices.map((group) => (
                <label
                  key={group.id}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-control border border-line px-3 py-1.5 text-label has-checked:border-ink has-checked:bg-surface-muted"
                >
                  <input
                    type="checkbox"
                    className="accent-ink"
                    checked={draft.groupIds.includes(group.id)}
                    onChange={() => toggleGroup(group.id)}
                  />
                  {group.isHidden ? `${group.name} (숨김)` : group.name}
                </label>
              ))}
            </div>
          )}
          {errorOf("groupIds") && (
            <p className="text-caption text-danger" role="alert">
              {errorOf("groupIds")}
            </p>
          )}
        </fieldset>

        <FormField label="레이아웃">
          {(control) => (
            <Select
              value={draft.layout}
              onValueChange={(value) => {
                if (value) patch({ layout: value as DeviceDraft["layout"] });
              }}
            >
              <SelectTrigger id={control.id} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LAYOUT_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {LAYOUT_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="전환 간격(초)"
            error={errorOf("rotationSeconds")}
            description={`${DEVICE_LIMITS.rotationSeconds.min}~${DEVICE_LIMITS.rotationSeconds.max}초`}
          >
            {(control) => (
              <Input
                {...control}
                type="number"
                inputMode="numeric"
                min={DEVICE_LIMITS.rotationSeconds.min}
                max={DEVICE_LIMITS.rotationSeconds.max}
                value={draft.rotationSeconds}
                onChange={(event) =>
                  patch({ rotationSeconds: event.target.value })
                }
              />
            )}
          </FormField>

          <FormField
            label="편성 갱신 주기(초)"
            error={errorOf("refreshAfterSeconds")}
            description="게시 중단이 이 TV에 반영되기까지의 최대 시간이에요."
          >
            {(control) => (
              <Input
                {...control}
                type="number"
                inputMode="numeric"
                min={DEVICE_LIMITS.refreshAfterSeconds.min}
                max={DEVICE_LIMITS.refreshAfterSeconds.max}
                value={draft.refreshAfterSeconds}
                onChange={(event) =>
                  patch({ refreshAfterSeconds: event.target.value })
                }
              />
            )}
          </FormField>
        </div>

        {device && (
          <FormField
            label="사용 여부"
            description="사용 안 함으로 두면 토큰이 있어도 이 TV가 편성을 받지 못해요."
          >
            {(control) => (
              <Select
                value={draft.isActive ? "active" : "inactive"}
                onValueChange={(value) => {
                  if (value) patch({ isActive: value === "active" });
                }}
              >
                <SelectTrigger id={control.id} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">사용</SelectItem>
                  <SelectItem value="inactive">사용 안 함</SelectItem>
                </SelectContent>
              </Select>
            )}
          </FormField>
        )}
      </div>
    </ConfirmActionDialog>
  );
}
