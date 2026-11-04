import { DEVICE_LIMITS } from "@/entities/device/model/types";
import type {
  DeviceInput,
  DisplayDevice,
  TargetGroup,
  UpdateDeviceInput,
} from "@/entities/device/model/types";
import { DEFAULT_LAYOUT_TYPE } from "@/entities/playlist/model/types";
import type { LayoutType } from "@/entities/playlist/model/types";

/**
 * 기기 등록·수정 폼의 입력값. 숫자 칸은 입력 중 빈 값이나 문자가 들어올 수 있어
 * 문자열로 들고 있다가 보낼 때 바꾼다.
 */
export interface DeviceDraft {
  name: string;
  location: string;
  groupIds: string[];
  layout: LayoutType;
  rotationSeconds: string;
  refreshAfterSeconds: string;
  /** 수정할 때만 쓴다. 등록하면 항상 사용 중이다. */
  isActive: boolean;
}

export type DeviceFieldName =
  "name" | "location" | "groupIds" | "rotationSeconds" | "refreshAfterSeconds";

export type DeviceFieldErrors = Partial<Record<DeviceFieldName, string>>;

/** 서버 기본값과 같다(`flyer-g-be` 기기 등록 기본값: 네 장씩 → 모아 보기, 10초, 60초). */
export function createEmptyDeviceDraft(): DeviceDraft {
  return {
    name: "",
    location: "",
    groupIds: [],
    layout: DEFAULT_LAYOUT_TYPE,
    rotationSeconds: String(DEVICE_LIMITS.rotationSeconds.fallback),
    refreshAfterSeconds: String(DEVICE_LIMITS.refreshAfterSeconds.fallback),
    isActive: true,
  };
}

export function draftFromDevice(device: DisplayDevice): DeviceDraft {
  return {
    name: device.name,
    location: device.location ?? "",
    groupIds: device.groupIds,
    layout: device.layout.type,
    rotationSeconds: String(device.layout.rotationSeconds),
    refreshAfterSeconds: String(device.refreshAfterSeconds),
    isActive: device.status !== "DISABLED",
  };
}

function checkSeconds(
  value: string,
  { min, max }: { min: number; max: number },
  label: string,
): string | null {
  const number = Number(value);
  if (value.trim() === "" || !Number.isInteger(number)) {
    return `${label}은 초 단위 정수로 입력하세요.`;
  }
  if (number < min || number > max) {
    return `${label}은 ${min}~${max}초 범위로 입력하세요.`;
  }
  return null;
}

/** 서버 DTO와 같은 범위로 검사한다. 서버가 최종 판단한다. */
export function validateDeviceDraft(draft: DeviceDraft): DeviceFieldErrors {
  const errors: DeviceFieldErrors = {};
  const name = draft.name.trim();
  if (name.length === 0) {
    errors.name = "기기 이름을 입력하세요.";
  } else if (name.length > DEVICE_LIMITS.nameMaxLength) {
    errors.name = `기기 이름은 ${DEVICE_LIMITS.nameMaxLength}자까지 입력할 수 있습니다.`;
  }
  // 서버가 위치 그룹 중 하나를 편성 그룹으로 쓴다(배포 ⑤). 없으면 등록할 수 없다.
  if (draft.groupIds.length === 0) {
    errors.groupIds = "위치 그룹을 하나 이상 선택하세요.";
  }
  if (draft.location.trim().length > DEVICE_LIMITS.locationMaxLength) {
    errors.location = `위치는 ${DEVICE_LIMITS.locationMaxLength}자까지 입력할 수 있습니다.`;
  }
  const rotation = checkSeconds(
    draft.rotationSeconds,
    DEVICE_LIMITS.rotationSeconds,
    "전환 간격",
  );
  if (rotation) errors.rotationSeconds = rotation;
  const refresh = checkSeconds(
    draft.refreshAfterSeconds,
    DEVICE_LIMITS.refreshAfterSeconds,
    "갱신 주기",
  );
  if (refresh) errors.refreshAfterSeconds = refresh;
  return errors;
}

export function toDeviceInput(draft: DeviceDraft): DeviceInput {
  return {
    name: draft.name.trim(),
    location: draft.location.trim() || null,
    groupIds: draft.groupIds,
    // MVP의 TV는 모두 가로다.
    orientation: "LANDSCAPE",
  };
}

/** 폼에서 바꾼 화면 설정만 뽑는다. 그대로면 기기 예외를 건드리지 않는다. */
function changedSettings(draft: DeviceDraft, device: DisplayDevice) {
  const rotationSeconds = Number(draft.rotationSeconds);
  const refreshAfterSeconds = Number(draft.refreshAfterSeconds);
  return {
    ...(draft.layout !== device.layout.type
      ? { posterLayout: draft.layout }
      : {}),
    ...(rotationSeconds !== device.layout.rotationSeconds
      ? { rotationSeconds }
      : {}),
    ...(refreshAfterSeconds !== device.refreshAfterSeconds
      ? { refreshAfterSeconds }
      : {}),
  };
}

/**
 * 화면 설정은 배포 ⑤부터 그룹 편성으로 옮겨 갔다. 편성 화면(9.3)이 생기기 전까지는
 * 기기 예외(`overrides.settings`)로 고친다. 응답에 `programGroupId`가 없는 옛 서버에는
 * 지금까지처럼 기기 필드로 보낸다.
 *
 * 위치 그룹을 바꾸면서 지금 편성 그룹을 빼면 서버가 거절하므로 남은 첫 그룹으로 옮긴다.
 */
export function toUpdateDeviceInput(
  draft: DeviceDraft,
  device: DisplayDevice,
): UpdateDeviceInput {
  const base = { ...toDeviceInput(draft), isActive: draft.isActive };
  if (device.programGroupId === null) {
    return {
      ...base,
      layout: draft.layout,
      rotationSeconds: Number(draft.rotationSeconds),
      refreshAfterSeconds: Number(draft.refreshAfterSeconds),
    };
  }
  const settings = changedSettings(draft, device);
  return {
    ...base,
    ...(draft.groupIds.includes(device.programGroupId)
      ? {}
      : { programGroupId: draft.groupIds[0] }),
    ...(Object.keys(settings).length > 0
      ? {
          overrides: {
            ...device.overrides,
            settings: { ...device.overrides?.settings, ...settings },
          },
        }
      : {}),
  };
}

export interface GroupOption {
  id: string;
  label: string;
  /** 숨겼거나 지워서 새로 고를 수 없다. 선택을 풀어야 저장할 수 있다. */
  unavailable: boolean;
}

/**
 * 위치 그룹 체크박스. 숨기지 않은 그룹과, 숨김·삭제 여부와 상관없이 지금 고른 그룹을
 * 모두 보여 준다. 고른 것이 목록에서 사라지면 풀 수 없는 id가 남아 저장이 계속 실패한다.
 *
 * - 이 기기에 원래 연결된 숨긴 그룹은 그대로 둘 수 있다(서버 허용). 풀었다가 다시
 *   고를 수 있게 선택하지 않았어도 남긴다.
 * - 새로 고른 숨긴 그룹과 목록에 없는(지운) 그룹은 `unavailable`이다.
 */
export function groupOptionsFor(
  groups: readonly TargetGroup[],
  selectedIds: readonly string[],
  attachedIds: readonly string[] = [],
): GroupOption[] {
  const listed = groups
    .filter(
      (group) =>
        !group.isHidden ||
        selectedIds.includes(group.id) ||
        attachedIds.includes(group.id),
    )
    .map((group) => ({
      id: group.id,
      label: group.isHidden ? `${group.name} (숨김)` : group.name,
      unavailable: group.isHidden && !attachedIds.includes(group.id),
    }));
  const missing = selectedIds
    .filter((id) => !groups.some((group) => group.id === id))
    .map((id) => ({ id, label: "삭제된 그룹", unavailable: true }));
  return [...listed, ...missing];
}

/** 새로 고를 수 없는 그룹이 선택에 남아 있을 때의 안내 */
export const UNAVAILABLE_GROUP_MESSAGE =
  "숨김 또는 삭제된 그룹이 있습니다. 해당 그룹의 선택을 해제하세요.";

/** 서버 422의 `fields`에서 폼 칸에 붙일 것만 고른다. */
export function toDeviceFieldErrors(
  fields: Record<string, string> | null,
): DeviceFieldErrors {
  const names: DeviceFieldName[] = [
    "name",
    "location",
    "groupIds",
    "rotationSeconds",
    "refreshAfterSeconds",
  ];
  // 기기 예외로 보낸 값은 점 경로로 돌아온다(`overrides.settings.rotationSeconds`).
  const messageOf = (name: DeviceFieldName) =>
    fields?.[name] ?? fields?.[`overrides.settings.${name}`];
  return Object.fromEntries(
    names.flatMap((name) => {
      const message = messageOf(name);
      return message ? [[name, message]] : [];
    }),
  );
}
