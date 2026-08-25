import type { AuthAdapter } from "./auth-adapter";
import type { Role, SessionUser } from "../model/types";

/**
 * 개발·테스트용 인증.
 *
 * 실제 자격 증명을 다루지 않는다. 어떤 역할로 볼지만 기억하며, 그 값도 토큰이
 * 아니라 역할 이름이다. 창을 닫으면 사라지도록 sessionStorage를 쓴다.
 *
 * production 빌드에서는 이 adapter가 선택되지 않는다. `createAuthAdapter()` 참고.
 */
const STORAGE_KEY = "flyer-g:mock-role";

const MOCK_USERS: Record<Role, SessionUser> = {
  SUBMITTER: {
    id: "user-submitter",
    displayName: "정하윤",
    roles: ["SUBMITTER"],
    organizationIds: ["org-superficial"],
  },
  REVIEWER: {
    id: "user-reviewer",
    displayName: "이수현",
    roles: ["SUBMITTER", "REVIEWER"],
    organizationIds: ["org-house-office"],
  },
  SUPER_ADMIN: {
    id: "user-operator",
    displayName: "김도윤",
    roles: ["SUBMITTER", "REVIEWER", "SUPER_ADMIN"],
    organizationIds: ["org-infoteam"],
  },
};

function readStoredRole(): Role | null {
  try {
    const value = sessionStorage.getItem(STORAGE_KEY);
    return value && value in MOCK_USERS ? (value as Role) : null;
  } catch {
    // 시크릿 창이나 저장소 차단 환경에서는 그냥 로그아웃 상태로 둔다.
    return null;
  }
}

function writeStoredRole(role: Role | null): void {
  try {
    if (role === null) sessionStorage.removeItem(STORAGE_KEY);
    else sessionStorage.setItem(STORAGE_KEY, role);
  } catch {
    // 저장에 실패해도 이번 세션 동안은 메모리 상태로 동작한다.
  }
}

export interface MockAuthAdapter extends AuthAdapter {
  /** 개발 전용 역할 전환. production 화면에서 호출되지 않는다. */
  switchRole(role: Role): SessionUser;
  getAvailableRoles(): readonly Role[];
}

export function createMockAuthAdapter(
  options: { initialRole?: Role | null } = {},
): MockAuthAdapter {
  let current: Role | null = options.initialRole ?? null;

  return {
    async restore() {
      const role = current ?? readStoredRole();
      current = role;
      return role ? MOCK_USERS[role] : null;
    },

    async signIn() {
      const role = current ?? readStoredRole() ?? "REVIEWER";
      current = role;
      writeStoredRole(role);
      return MOCK_USERS[role];
    },

    async signOut() {
      current = null;
      writeStoredRole(null);
    },

    switchRole(role) {
      current = role;
      writeStoredRole(role);
      return MOCK_USERS[role];
    },

    getAvailableRoles() {
      return Object.keys(MOCK_USERS) as Role[];
    },
  };
}
