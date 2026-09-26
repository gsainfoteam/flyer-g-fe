import { Link, Navigate, Outlet, useLocation } from "react-router";
import { RETURN_TO_PARAM, to } from "@/shared/config/routes";
import { ErrorState, LoadingState } from "@/shared/components";
import { Button } from "@/shared/ui/button";
import { useAuth } from "../model/auth-context";
import { SERVICE_OPERATOR } from "@/shared/config/service-info";
import { ROLES, getRoleLabel, hasAnyRole } from "../model/types";
import type { Role } from "../model/types";

/**
 * 세션이 있어야 볼 수 있는 화면을 감싼다.
 *
 * 화면을 감추는 것은 편의일 뿐 보안이 아니다. 서버가 모든 변경 요청에서 권한을
 * 다시 검증한다. (명세 FR-AUTH-01)
 */
export function RequireSession() {
  const { state } = useAuth();
  const location = useLocation();

  if (state.status === "initializing") {
    return (
      <div className="mx-auto max-w-content px-6 py-16 lg:px-10">
        <LoadingState rows={3} label="로그인 상태를 확인하고 있어요." />
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="mx-auto max-w-content px-6 py-16 lg:px-10">
        <ErrorState
          error={state.error}
          title="로그인 상태를 확인하지 못했어요"
          onRetry={() => window.location.reload()}
          retryLabel="다시 시도"
        />
      </div>
    );
  }

  if (state.status === "unauthenticated") {
    const returnTo = `${location.pathname}${location.search}`;
    return <Navigate to={to.login(returnTo)} replace />;
  }

  return <Outlet />;
}

/** 특정 역할만 볼 수 있는 화면을 감싼다. `RequireSession` 안쪽에서 쓴다. */
export function RequireRole({ allow }: { allow: readonly Role[] }) {
  const { state } = useAuth();

  if (state.status !== "authenticated") {
    // RequireSession이 이미 처리한다. 여기까지 오면 렌더링만 멈춘다.
    return null;
  }

  if (!hasAnyRole(state.user, allow)) {
    return <ForbiddenView allow={allow} />;
  }

  return <Outlet />;
}

/** 이 화면을 볼 수 있는 역할을 사람이 읽을 수 있게. 가장 낮은 역할부터 적는다. */
function describeAllowed(allow: readonly Role[]): string {
  const labels = ROLES.filter((role) => allow.includes(role)).map(getRoleLabel);
  return labels.length === 1 ? `${labels[0]}에게만` : `${labels.join("와 ")}에게`;
}

export function ForbiddenView({ allow }: { allow: readonly Role[] }) {
  // 시스템 운영자 권한은 운영 주체가, 하우스 관리자 권한은 하우스오피스가 준다.
  const grantor = allow.includes("REVIEWER")
    ? "학사기숙사 하우스오피스"
    : SERVICE_OPERATOR;

  return (
    <div className="flex flex-col items-start gap-3 py-10">
      <h1 className="text-title text-ink">이 화면을 볼 권한이 없어요</h1>
      <p className="text-body text-ink-muted">
        {describeAllowed(allow)} 열려 있는 화면이에요. 권한이 필요하면 {grantor}에
        문의해 주세요.
      </p>
      <Button variant="secondary" size="sm" asChild className="mt-1">
        <Link to={to.dashboard()}>홈으로</Link>
      </Button>
    </div>
  );
}

export { RETURN_TO_PARAM };
