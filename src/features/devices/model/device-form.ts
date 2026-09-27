import { DEVICE_LIMITS } from "@/entities/device/model/types";
import type {
  DeviceInput,
  DisplayDevice,
  UpdateDeviceInput,
} from "@/entities/device/model/types";
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

export const LAYOUT_LABELS: Record<LayoutType, string> = {
  SINGLE: "한 장씩",
  FOUR_GRID: "네 장씩",
};

/** 서버 기본값과 같다(`flyer-g-be` 기기 등록 기본값: 네 장씩, 10초, 60초). */
export function createEmptyDeviceDraft(): DeviceDraft {
  return {
    name: "",
    location: "",
    groupIds: [],
    layout: "FOUR_GRID",
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
    return `${label}은 정수(초)로 입력해 주세요.`;
  }
  if (number < min || number > max) {
    return `${label}은 ${min}~${max}초 사이여야 해요.`;
  }
  return null;
}

/** 서버 DTO와 같은 범위로 검사한다. 서버가 최종 판단한다. */
export function validateDeviceDraft(draft: DeviceDraft): DeviceFieldErrors {
  const errors: DeviceFieldErrors = {};
  const name = draft.name.trim();
  if (name.length === 0) {
    errors.name = "기기 이름을 입력해 주세요.";
  } else if (name.length > DEVICE_LIMITS.nameMaxLength) {
    errors.name = `기기 이름은 ${DEVICE_LIMITS.nameMaxLength}자까지 쓸 수 있어요.`;
  }
  if (draft.location.trim().length > DEVICE_LIMITS.locationMaxLength) {
    errors.location = `위치는 ${DEVICE_LIMITS.locationMaxLength}자까지 쓸 수 있어요.`;
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
    layout: draft.layout,
    rotationSeconds: Number(draft.rotationSeconds),
    refreshAfterSeconds: Number(draft.refreshAfterSeconds),
  };
}

export function toUpdateDeviceInput(draft: DeviceDraft): UpdateDeviceInput {
  return { ...toDeviceInput(draft), isActive: draft.isActive };
}

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
  return Object.fromEntries(
    names.filter((name) => fields?.[name]).map((name) => [name, fields![name]]),
  );
}
