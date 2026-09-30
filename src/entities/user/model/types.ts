import type { Role } from "./role";

/**
 * 역할 관리 화면의 사용자 (`GET /signage/users`, gsainfoteam/flyer-g-be#17).
 *
 * 사용자는 첫 로그인 때 만들어진다. 한 번도 로그인하지 않은 사람은 목록에 없고 역할도
 * 줄 수 없다.
 */

/** 따로 주고 빼는 역할. 로그인한 모두가 가지는 SUBMITTER는 대상이 아니다. */
export const GRANTABLE_ROLES = ["REVIEWER", "SUPER_ADMIN"] as const;
export type GrantableRole = (typeof GRANTABLE_ROLES)[number];

export function isGrantableRole(value: unknown): value is GrantableRole {
  return (GRANTABLE_ROLES as readonly unknown[]).includes(value);
}

export interface AdminUser {
  id: string;
  /** 로그인 제공자의 이름 */
  name: string;
  email: string;
  /** 교직원처럼 학번 인증이 없으면 null */
  studentId: string | null;
  /** 따로 받은 역할. SUBMITTER는 들어 있지 않다. */
  grantedRoles: GrantableRole[];
  lastLoginAt: Date;
  /** 첫 로그인 */
  createdAt: Date;
}

/** 검색어 최대 길이. 서버 `USER_QUERY_MAX_LENGTH`와 같다. */
export const USER_QUERY_MAX_LENGTH = 100;

export interface UserListParams {
  /** 이름·이메일·학번 부분 일치. 대소문자를 무시하고, 비우면 전체다. */
  q?: string;
  /**
   * 이 역할을 받은 사람만. 받은 역할 그대로 거른다 — REVIEWER로 거르면 SUPER_ADMIN만
   * 가진 사람은 빠진다.
   */
  role?: GrantableRole;
  cursor?: string | null;
  /** 1~100. 비우면 서버 기본값 20 */
  limit?: number;
}

/**
 * 화면에 보이는 역할 하나. 가진 역할 중 가장 높은 것이다.
 *
 * SUPER_ADMIN은 REVIEWER 권한을 포함하므로, 둘 다 가졌든 SUPER_ADMIN만 가졌든
 * 시스템 운영자다.
 */
export function roleLevelOf(grantedRoles: readonly GrantableRole[]): Role {
  if (grantedRoles.includes("SUPER_ADMIN")) return "SUPER_ADMIN";
  if (grantedRoles.includes("REVIEWER")) return "REVIEWER";
  return "SUBMITTER";
}

export type RoleChangeStep =
  | { type: "grant"; role: GrantableRole }
  | { type: "revoke"; role: GrantableRole };

/**
 * 역할 하나를 고르면 보낼 요청들. 순서대로 보낸다.
 *
 * - 올릴 때는 더 줄 역할만 준다. 시스템 운영자로 올려도 있던 REVIEWER는 그대로 둔다.
 * - 운영자만 가진 사람을 하우스 관리자로 내리면 REVIEWER를 먼저 주고 SUPER_ADMIN을
 *   뺀다. 중간에 실패해도 검토 권한이 비는 순간이 없다.
 * - 게시자로 내릴 때는 SUPER_ADMIN부터 뺀다. 중간에 실패하면 낮은 쪽이 남는다.
 */
export function planRoleChange(
  grantedRoles: readonly GrantableRole[],
  target: Role,
): RoleChangeStep[] {
  const has = (role: GrantableRole) => grantedRoles.includes(role);
  const grant = (role: GrantableRole): RoleChangeStep[] =>
    has(role) ? [] : [{ type: "grant", role }];
  const revoke = (role: GrantableRole): RoleChangeStep[] =>
    has(role) ? [{ type: "revoke", role }] : [];
  switch (target) {
    case "SUPER_ADMIN":
      return grant("SUPER_ADMIN");
    case "REVIEWER":
      return [...grant("REVIEWER"), ...revoke("SUPER_ADMIN")];
    case "SUBMITTER":
      return [...revoke("SUPER_ADMIN"), ...revoke("REVIEWER")];
  }
}
