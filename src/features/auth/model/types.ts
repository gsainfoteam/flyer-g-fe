import type { ApiError } from "@/shared/api/error";

/**
 * 사용자 역할 (명세 3장).
 *
 * 디스플레이 기기는 사용자 계정이 아니라 기기 전용 자격 증명을 쓴다. 그래서 이
 * 목록에 넣지 않는다. 기기 경계는 `features/display`가 따로 가진다.
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

export interface SessionUser {
  id: string;
  displayName: string;
  roles: Role[];
  organizationIds: string[];
}

/**
 * 인증 상태.
 *
 * `initializing`은 기존 세션을 복원하는 동안이다. 이 상태에서 화면을 그리면
 * 로그인한 사용자에게 로그인 화면이 잠깐 스쳐 보인다.
 */
export type AuthState =
  | { status: "initializing" }
  | { status: "authenticated"; user: SessionUser }
  | { status: "unauthenticated" }
  | { status: "error"; error: ApiError };

/** 가장 높은 역할 하나를 고른다. 화면에 역할을 한 줄로 보여줄 때 쓴다. */
export function getPrimaryRole(user: SessionUser): Role {
  if (user.roles.includes("SUPER_ADMIN")) return "SUPER_ADMIN";
  if (user.roles.includes("REVIEWER")) return "REVIEWER";
  return "SUBMITTER";
}

export function hasAnyRole(
  user: SessionUser,
  allowed: readonly Role[],
): boolean {
  return allowed.some((role) => user.roles.includes(role));
}
