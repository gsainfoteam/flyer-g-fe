import { Outlet, useSearchParams } from "react-router";
import { useNewBuildReload } from "@/features/display-runtime/model/use-new-build-reload";
import { useScreenWakeLock } from "@/features/display-runtime/model/use-screen-wake-lock";
import { DisplayErrorBoundary } from "@/features/display-runtime/ui/DisplayErrorBoundary";
import { cn } from "@/shared/lib/utils";

/**
 * TV 플레이어 셸.
 *
 * 관리 내비게이션도 푸터도 없다. 사람이 조작하지 않는 화면이라 이동 수단을 두지
 * 않는다. 사용자 로그인도 요구하지 않는다 — 기기는 기기 전용 자격 증명으로
 * 편성을 받는다. (명세 3.1, FR-PLY-01)
 *
 * 운영 모드(`?preview=1`이 아닐 때)는 kiosk로 본다. 커서를 숨기고, 화면이 꺼지지
 * 않게 하고, 새 배포가 나오면 스스로 새로고침한다. 오류 화면에서도 같다.
 */
export function DisplayLayout() {
  const [searchParams] = useSearchParams();
  const isKiosk = searchParams.get("preview") !== "1";

  useScreenWakeLock(isKiosk);
  useNewBuildReload({ enabled: isKiosk && import.meta.env.PROD });

  return (
    <div
      className={cn(
        "tv-surface h-screen overflow-hidden text-ink select-none",
        isKiosk && "cursor-none",
      )}
    >
      {/* kiosk에는 새로고침해 줄 사람이 없다. 오류 시 안전 화면 후 자동 복구한다. */}
      <DisplayErrorBoundary>
        <Outlet />
      </DisplayErrorBoundary>
    </div>
  );
}
