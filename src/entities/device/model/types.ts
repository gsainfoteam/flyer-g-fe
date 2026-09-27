import { parseIsoUtc } from "@/shared/lib/datetime";

/** 명세 6.4 DisplayDevice */
export const DEVICE_STATUSES = ["ONLINE", "OFFLINE", "DISABLED"] as const;
export type DeviceStatus = (typeof DEVICE_STATUSES)[number];

export const DEVICE_ORIENTATIONS = ["LANDSCAPE", "PORTRAIT"] as const;
export type DeviceOrientation = (typeof DEVICE_ORIENTATIONS)[number];

export interface DisplayDeviceDto {
  id: string;
  name: string;
  location: string | null;
  groupIds: string[];
  /** MVP는 LANDSCAPE만 사용한다. */
  orientation: DeviceOrientation;
  /** 기기가 마지막으로 알린 해상도. heartbeat를 받기 전에는 null */
  resolution: { width: number; height: number } | null;
  lastSeenAt: string | null;
  appVersion: string | null;
  status: DeviceStatus;
}

export interface DisplayDevice extends Omit<DisplayDeviceDto, "lastSeenAt"> {
  lastSeenAt: Date | null;
}

/**
 * 기기 목록. "마지막 연결 3분 전" 같은 표시는 클라이언트 시계가 아니라 서버 시각으로
 * 센다. 서버 목록 응답에는 시각이 없어(`API-FOLLOWUP-2026-09.md` 2-2) null일 수 있고,
 * 그때 화면은 함께 받은 다른 응답의 서버 시각을 쓴다.
 */
export interface DeviceList {
  items: DisplayDevice[];
  serverTime: Date | null;
}

export function toDisplayDevice(dto: DisplayDeviceDto): DisplayDevice {
  return {
    ...dto,
    lastSeenAt: dto.lastSeenAt ? parseIsoUtc(dto.lastSeenAt) : null,
  };
}

/**
 * 게시 대상 위치 묶음 (`API-REQUIREMENTS.md` 10.2).
 *
 * 신청의 `targetGroupIds`가 가리킨다. 비어 있으면 모든 위치에 게시한다.
 */
export interface TargetGroup {
  id: string;
  name: string;
  deviceCount: number;
}

/**
 * 신청의 대상 위치를 한 줄로 읽는다.
 *
 * 그룹 목록을 아직 받지 못했거나 모르는 id면 id를 그대로 두지 않고 빼서 읽는다.
 * 사람이 읽을 수 없는 식별자를 화면에 흘리지 않기 위해서다.
 */
export function describeTargetGroups(
  groupIds: readonly string[],
  groups: readonly TargetGroup[],
): string {
  if (groupIds.length === 0) return "모든 위치";
  const names = groupIds
    .map((id) => groups.find((group) => group.id === id)?.name)
    .filter((name): name is string => Boolean(name));
  return names.length > 0 ? names.join(", ") : "지정된 위치";
}
