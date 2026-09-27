import { to } from "@/shared/config/routes";

/**
 * TV 설정 링크. 등록·재발급 응답의 토큰으로 만든다. `#` 뒤는 서버로 가지 않는다.
 * (`API-CHANGES-BACKEND.md` 8절 "TV 설정 흐름")
 */
export interface SetupLinkResult {
  deviceId: string;
  deviceName: string;
  token: string;
  /** created: 새로 등록, rotated: 재발급해 이전 토큰이 끊김 */
  reason: "created" | "rotated";
}

export function setupLinkOf(
  deviceId: string,
  token: string,
  origin: string = window.location.origin,
): string {
  return `${origin}${to.display(deviceId)}#token=${encodeURIComponent(token)}`;
}
