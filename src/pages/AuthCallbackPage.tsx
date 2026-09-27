import { useEffect, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router";
import { useAuth } from "@/features/auth/model/auth-context";
import { normalizeApiError } from "@/shared/api/error";
import type { ApiError } from "@/shared/api/error";
import { ErrorState, LoadingState } from "@/shared/components";
import { Logo } from "@/shared/components/Logo";
import { to } from "@/shared/config/routes";

/**
 * 로그인 제공자에서 돌아오는 화면 (`/auth/callback`).
 *
 * 주소의 code를 서버에 넘겨 로그인을 마치고, 시작할 때 보던 화면으로 돌아간다.
 * 실패하면 이유를 알리고 다시 로그인하게 한다. code는 한 번만 쓸 수 있어서 이
 * 화면에서 다시 시도해도 소용이 없다.
 */
export function AuthCallbackPage() {
  const { state, completeSignIn } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<ApiError | null>(null);
  const hasResult = params.has("code") || params.has("error");

  useEffect(() => {
    if (!hasResult) return;
    let active = true;
    completeSignIn(params)
      .then((returnTo) => {
        if (active) void navigate(returnTo, { replace: true });
      })
      .catch((cause: unknown) => {
        if (active) setError(normalizeApiError(cause));
      });
    return () => {
      active = false;
    };
  }, [completeSignIn, hasResult, navigate, params]);

  // 주소를 직접 열었거나 뒤로 가기로 다시 왔다. 할 일이 없다.
  if (!hasResult) {
    return (
      <Navigate
        to={state.status === "authenticated" ? to.dashboard() : to.login()}
        replace
      />
    );
  }

  return (
    <div className="flex min-h-screen items-center bg-canvas px-6 text-ink lg:px-10">
      <div className="mx-auto flex w-full max-w-form flex-col items-center">
        <Logo size="lg" />
        <div className="mt-9 w-full max-w-xs">
          {error ? (
            <ErrorState
              error={error}
              title="로그인하지 못했어요"
              onRetry={() => void navigate(to.login(), { replace: true })}
              retryLabel="다시 로그인"
            />
          ) : (
            <LoadingState rows={2} label="로그인을 마무리하고 있어요." />
          )}
        </div>
      </div>
    </div>
  );
}
