import { useEffect } from "react";
import { Link, useRouteError } from "react-router";
import { to } from "@/app/router/routes";
import { Logo } from "@/components/common/Logo";
import { LiveClock } from "@/components/display/LiveClock";
import { ScaledStage } from "@/components/display/ScaledStage";
import { ZIGGLE_HOST } from "@/shared/lib/ziggle-url";
import { Button } from "@/shared/ui/button";
import { isStaleChunkError, reloadOnceForStaleChunk } from "./stale-chunk";

/**
 * 화면을 그리다 난 오류와 화면 조각을 못 받은 오류를 받는 마지막 자리.
 *
 * 없으면 라우터 기본 화면("Unexpected Application Error"와 영어 stack)이 뜨고
 * 메뉴도 사라진다. 오류 내용은 공개 화면에 그리지 않는다.
 */
export function RouteErrorScreen() {
  const error = useRouteError();
  const staleChunk = isStaleChunkError(error);

  useEffect(() => {
    if (staleChunk) reloadOnceForStaleChunk();
  }, [staleChunk]);

  return (
    <div className="flex min-h-screen items-center bg-canvas px-6 text-ink lg:px-10">
      <div className="mx-auto w-full max-w-content">
        <Logo size="lg" />
        <h1 className="mt-8 text-display text-ink">
          {staleChunk ? "새 버전이 나왔어요" : "화면을 여는 중에 문제가 생겼어요"}
        </h1>
        <p className="mt-2 text-body text-ink-muted">
          {staleChunk
            ? "새로고침하면 새 버전으로 이어서 쓸 수 있어요."
            : "새로고침해도 계속되면 잠시 뒤 다시 열어 주세요. 입력하던 내용은 저장되지 않았을 수 있어요."}
        </p>
        <div className="mt-6 flex gap-2.5">
          <Button onClick={() => window.location.reload()}>새로고침</Button>
          {!staleChunk && (
            <Button variant="secondary" asChild>
              <Link to={to.dashboard()}>홈으로</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * TV용. 사람이 누를 수 없으니 버튼 대신 잠시 뒤 스스로 새로고침한다. 오프라인이면
 * 새로 받을 수 없으므로 연결이 돌아올 때까지 기다린다.
 */
const DISPLAY_RELOAD_DELAY_MS = 30_000;

export function DisplayRouteErrorScreen() {
  useEffect(() => {
    const reload = () => {
      if (navigator.onLine) window.location.reload();
    };
    const id = window.setTimeout(reload, DISPLAY_RELOAD_DELAY_MS);
    window.addEventListener("online", reload);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("online", reload);
    };
  }, []);

  return (
    <ScaledStage className="h-screen w-full cursor-none">
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-4">
          <Logo size="tv" />
          <LiveClock ticking className="ml-auto text-[32px]" />
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
          <h1 className="text-[72px] leading-tight font-extrabold text-ink">
            잠시 후 다시 시작합니다
          </h1>
          <p className="text-[32px] text-ink-muted">
            게시 신청은 Ziggle 공지에서 할 수 있어요 · {ZIGGLE_HOST}
          </p>
        </div>
      </div>
    </ScaledStage>
  );
}
