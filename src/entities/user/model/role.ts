/**
 * 사용자 역할 (명세 3장).
 *
 * 디스플레이 기기는 사용자 계정이 아니라 기기 전용 자격 증명을 쓴다. 그래서 이
 * 목록에 넣지 않는다. 기기 경계는 `features/display`가 따로 가진다.
 *
 * 세션(`features/auth`)과 역할 관리(`features/user-roles`)가 함께 쓰므로 여기에 둔다.
 */
export const ROLES = ["SUBMITTER", "REVIEWER", "SUPER_ADMIN"] as const;
export type Role = (typeof ROLES)[number];

const ROLE_LABELS: Record<Role, string> = {
  SUBMITTER: "게시자",
  REVIEWER: "하우스 관리자",
  SUPER_ADMIN: "시스템 운영자",
};

export function getRoleLabel(role: Role): string {
  return ROLE_LABELS[role];
}
