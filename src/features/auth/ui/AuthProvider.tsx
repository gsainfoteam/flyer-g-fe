import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { normalizeApiError } from "@/shared/api/error";
import type { AuthAdapter } from "../api/auth-adapter";
import { isMockAuthAdapter } from "../api/mock-auth";
import { AuthContext } from "../model/auth-context";
import type { AuthContextValue } from "../model/auth-context";
import type { AuthState, Role } from "../model/types";

/**
 * 세션 상태를 앱 전체에 공급한다.
 *
 * 시작하면 기존 세션 복원을 한 번 시도한다. 그동안은 `initializing`이라 guard가
 * 로그인 화면으로 보내지 않는다. 로그인한 사용자에게 로그인 화면이 스쳐 보이는
 * 것을 막기 위한 것이다.
 */
interface AuthProviderProps {
  adapter: AuthAdapter;
  children: ReactNode;
}

export function AuthProvider({ adapter, children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({ status: "initializing" });

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    adapter
      .restore(controller.signal)
      .then((user) => {
        if (!active) return;
        // 복원하는 사이 로그인 복귀(`/auth/callback`)가 먼저 끝났으면 덮어쓰지 않는다.
        setState((current) =>
          current.status !== "initializing"
            ? current
            : user
              ? { status: "authenticated", user }
              : { status: "unauthenticated" },
        );
      })
      .catch((cause: unknown) => {
        if (!active) return;
        const error = normalizeApiError(cause);
        if (error.kind === "canceled") return;
        setState((current) =>
          current.status === "initializing" ? { status: "error", error } : current,
        );
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [adapter]);

  const signIn = useCallback(
    async (returnTo: string) => {
      try {
        const user = await adapter.signIn(returnTo);
        setState(
          user
            ? { status: "authenticated", user }
            : { status: "unauthenticated" },
        );
        return user;
      } catch (cause) {
        setState({ status: "error", error: normalizeApiError(cause) });
        return null;
      }
    },
    [adapter],
  );

  const completeSignIn = useCallback(
    async (params: URLSearchParams) => {
      const { user, returnTo } = await adapter.completeSignIn(params);
      setState({ status: "authenticated", user });
      return returnTo;
    },
    [adapter],
  );

  const signOut = useCallback(async () => {
    await adapter.signOut();
    setState({ status: "unauthenticated" });
  }, [adapter]);

  const expireSession = useCallback(() => {
    // 서버 세션은 이미 끝났다. 남은 로컬 흔적만 지우며, 실패해도 화면은 넘어간다.
    void adapter.signOut().catch(() => undefined);
    setState({ status: "unauthenticated", reason: "expired" });
  }, [adapter]);

  const switchRole = useMemo(() => {
    if (!isMockAuthAdapter(adapter)) return null;
    return (role: Role) => {
      setState({ status: "authenticated", user: adapter.switchRole(role) });
    };
  }, [adapter]);

  const availableRoles = useMemo(
    () => (isMockAuthAdapter(adapter) ? adapter.getAvailableRoles() : []),
    [adapter],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      state,
      signIn,
      completeSignIn,
      signOut,
      expireSession,
      switchRole,
      availableRoles,
    }),
    [
      state,
      signIn,
      completeSignIn,
      signOut,
      expireSession,
      switchRole,
      availableRoles,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
