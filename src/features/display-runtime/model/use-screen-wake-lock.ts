import { useEffect } from "react";

/**
 * 화면이 절전으로 꺼지지 않게 한다 (Screen Wake Lock API).
 *
 * TV 브라우저·키오스크 설정으로 이미 막혀 있는 경우가 많지만, 설정이 빠진 기기도
 * 게시판이 꺼지지 않게 한다. 탭이 가려지면 브라우저가 잠금을 풀어 버리므로 다시
 * 보일 때 다시 요청한다. 지원하지 않거나 거절되면 조용히 넘어간다.
 */
export function useScreenWakeLock(enabled = true) {
  useEffect(() => {
    if (!enabled || !("wakeLock" in navigator)) return;
    let sentinel: WakeLockSentinel | null = null;
    let disposed = false;

    const acquire = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const next = await navigator.wakeLock.request("screen");
        if (disposed) void next.release();
        else sentinel = next;
      } catch {
        // 저전력 모드나 권한 정책으로 거절될 수 있다. 재생에는 영향이 없다.
      }
    };

    const onVisibility = () => void acquire();
    void acquire();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", onVisibility);
      void sentinel?.release().catch(() => undefined);
    };
  }, [enabled]);
}
