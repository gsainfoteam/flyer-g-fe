/** 명세 6.4 DisplayDevice */
export const DEVICE_STATUSES = ["ONLINE", "OFFLINE", "DISABLED"] as const;
export type DeviceStatus = (typeof DEVICE_STATUSES)[number];

export const DEVICE_ORIENTATIONS = ["LANDSCAPE", "PORTRAIT"] as const;
export type DeviceOrientation = (typeof DEVICE_ORIENTATIONS)[number];

export interface DisplayDeviceDto {
  id: string;
  name: string;
  location: string;
  groupIds: string[];
  /** MVP는 LANDSCAPE만 사용한다. */
  orientation: DeviceOrientation;
  resolution: { width: number; height: number };
  lastSeenAt: string | null;
  appVersion: string | null;
  status: DeviceStatus;
}

export interface DisplayDevice extends Omit<DisplayDeviceDto, "lastSeenAt"> {
  lastSeenAt: Date | null;
}
