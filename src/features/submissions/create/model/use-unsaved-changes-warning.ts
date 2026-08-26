import { useCallback } from "react";
import { useBeforeUnload, useBlocker } from "react-router";

/**
 * 작성 중 이탈 경고 (명세 FR-SUB-04).
 *
 * 포스터를 올리고 폼을 채우다 실수로 나가면 전부 사라진다. 브라우저 닫기·새로고침은
 * `beforeunload`로, 앱 안에서의 이동은 router blocker로 막는다.
 *
 * 임시 저장은 서버 draft 계약이 정해진 뒤에 검토한다. 지금은 경고까지만 한다.
 */
export function useUnsavedChangesWarning(enabled: boolean) {
  useBeforeUnload(
    useCallback(
      (event: BeforeUnloadEvent) => {
        if (!enabled) return;
        // 최신 브라우저는 문구를 무시하고 기본 확인창만 띄운다.
        event.preventDefault();
        event.returnValue = "";
      },
      [enabled],
    ),
  );

  return useBlocker(
    useCallback(
      ({
        currentLocation,
        nextLocation,
      }: {
        currentLocation: { pathname: string };
        nextLocation: { pathname: string };
      }) => enabled && currentLocation.pathname !== nextLocation.pathname,
      [enabled],
    ),
  );
}
