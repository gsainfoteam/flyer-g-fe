import type { ApiError } from "@/shared/api/error";
import type { Role } from "@/entities/user/model/role";

export { ROLES, getRoleLabel } from "@/entities/user/model/role";
export type { Role } from "@/entities/user/model/role";

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
  | {
      status: "unauthenticated";
      /** 로그인한 상태였는데 서버가 세션을 거절했다(401). 로그인 화면이 안내한다. */
      reason?: "expired";
    }
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
