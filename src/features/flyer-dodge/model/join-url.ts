import { to } from "@/shared/config/routes";

/** 폰 참가 주소. 이번 판의 표(`ticket`)를 실어 지난 판 QR로는 들어오지 못하게 한다. */
export function dodgeJoinUrlOf(roomId: string, ticket: string): string {
  return `${window.location.origin}${to.playFlyerDodge(roomId, ticket)}`;
}
