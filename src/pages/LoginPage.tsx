import { Info } from "lucide-react";
import { useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router";
import { RETURN_TO_PARAM, safeReturnTo } from "@/shared/config/routes";
import { Logo } from "@/shared/components/Logo";
import { useAuth } from "@/features/auth/model/auth-context";
import { ErrorState, LoadingState } from "@/shared/components";
import { SERVICE_OPERATOR } from "@/shared/config/service-info";
import { Alert, AlertTitle } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";

/**
 * 로그인 시작 화면.
 *
 * 전단지는 자체 계정을 두지 않는다. Ziggle과 같은 인증 제공자로 넘겼다가 돌아온다.
 * 실제 연결 방식은 아직 확정되지 않아 adapter 뒤에 있다. (명세 FR-AUTH-01, 15장 13번)
 */
export function LoginPage() {
  const { state, signIn } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [isPending, setIsPending] = useState(false);

  const returnTo = safeReturnTo(params.get(RETURN_TO_PARAM));

  if (state.status === "initializing") {
    return (
      <Centered>
        <LoadingState rows={2} label="로그인 상태를 확인하고 있어요." />
      </Centered>
    );
  }

  // 이미 로그인했으면 원래 가려던 곳으로 보낸다.
  if (state.status === "authenticated") {
    return <Navigate to={returnTo} replace />;
  }

  const handleSignIn = async () => {
    setIsPending(true);
    try {
      const user = await signIn(returnTo);
      if (user) void navigate(returnTo, { replace: true });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Centered>
      <div className="flex flex-col items-center text-center">
        <Logo size="lg" />
        <h1 className="mt-9 text-display text-ink">
          Ziggle 계정으로 시작해요
        </h1>
        <p className="mt-2.5 text-body text-ink-muted">
          Ziggle에서 쓰던 계정으로 바로 로그인할 수 있어요.
        </p>

        {state.status === "unauthenticated" && state.reason === "expired" && (
          <Alert variant="info" className="mt-5 w-full max-w-xs">
            <Info aria-hidden="true" />
            {/* 돌아갈 화면 안내는 버튼 아래 문구가 맡는다. */}
            <AlertTitle>로그인이 만료되었어요</AlertTitle>
          </Alert>
        )}

        {state.status === "error" && (
          <ErrorState
            error={state.error}
            title="로그인하지 못했어요"
            className="mt-5 w-full max-w-xs text-left"
          />
        )}

        <Button
          onClick={handleSignIn}
          disabled={isPending}
          size="lg"
          className="mt-8 w-full max-w-xs"
        >
          {isPending ? "이동하는 중…" : "Ziggle 계정으로 로그인"}
        </Button>

        {returnTo !== "/" && (
          <p className="mt-4 text-caption text-ink-subtle">
            로그인하면 보고 있던 화면으로 돌아갑니다.
          </p>
        )}
      </div>

      <p className="mt-16 text-center text-caption text-ink-subtle">
        GIST 학사기숙사 로비 TV 게시판 · {SERVICE_OPERATOR}
      </p>
    </Centered>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center bg-canvas px-6 text-ink lg:px-10">
      <div className="mx-auto w-full max-w-form">
        {children}
      </div>
    </div>
  );
}
