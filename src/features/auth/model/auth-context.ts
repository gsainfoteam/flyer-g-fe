import { createContext, useContext } from "react";
import type { AuthState, Role, SessionUser } from "./types";

export interface AuthContextValue {
  state: AuthState;
  /** 로그인을 시작한다. 성공하면 `returnTo`로 이동하는 것은 호출부 책임이다. */
  signIn: (returnTo: string) => Promise<SessionUser | null>;
  signOut: () => Promise<void>;
  /**
   * 서버가 401을 주면 부른다. 세션을 정리하고 로그인 화면이 만료를 안내하게 한다.
   * guard가 지금 경로를 `returnTo`로 붙여 로그인으로 보낸다.
   */
  expireSession: () => void;
  /** 개발용 역할 전환. mock 세션이 아닐 때는 null이다. */
  switchRole: ((role: Role) => void) | null;
  availableRoles: readonly Role[];
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (value === null) {
    throw new Error("useAuth는 AuthProvider 안에서만 쓸 수 있습니다.");
  }
  return value;
}

/** 인증된 사용자만 쓰는 화면에서 쓴다. guard 안쪽에서만 호출한다. */
export function useSessionUser(): SessionUser {
  const { state } = useAuth();
  if (state.status !== "authenticated") {
    throw new Error("인증된 세션이 없는 곳에서 useSessionUser를 불렀습니다.");
  }
  return state.user;
}
