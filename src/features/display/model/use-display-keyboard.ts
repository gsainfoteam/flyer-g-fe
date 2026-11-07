import { useEffect, useEffectEvent } from "react";

export const MANUAL_PLAYBACK_HOLD_MS = 20_000;

/** USB 키보드/버튼의 한 번 누름을 한 번의 넘김으로 처리한다. */
export function useDisplayKeyboard({
  enabled,
  onAdvance,
  onPauseChange,
}: {
  enabled: boolean;
  onAdvance: () => void;
  onPauseChange: (paused: boolean) => void;
}) {
  const canAdvance = useEffectEvent(() => enabled);
  const advance = useEffectEvent(() => {
    onPauseChange(true);
    onAdvance();
  });
  const resume = useEffectEvent(() => onPauseChange(false));

  useEffect(() => {
    const held = new Set<string>();
    let resumeTimer: number | undefined;
    const keydown = (event: KeyboardEvent) => {
      if (event.key !== "Enter" && event.key !== "ArrowRight") return;
      const alreadyHeld = held.has(event.key);
      held.add(event.key);
      if (
        event.defaultPrevented ||
        event.altKey || event.ctrlKey || event.metaKey || event.shiftKey ||
        event.isComposing || document.visibilityState === "hidden" ||
        (event.target instanceof Element && event.target.closest(
          'input, textarea, select, button, a[href], [contenteditable]:not([contenteditable="false"]), [role="button"], [role="textbox"]',
        )) ||
        !canAdvance()
      ) return;

      // 스크롤·기본 클릭도 막는다. repeat를 보내지 않는 장치도 keyup까지 잠근다.
      event.preventDefault();
      if (event.repeat || alreadyHeld) return;
      advance();
      window.clearTimeout(resumeTimer);
      resumeTimer = window.setTimeout(resume, MANUAL_PLAYBACK_HOLD_MS);
    };
    const keyup = (event: KeyboardEvent) => held.delete(event.key);
    const release = () => held.clear();
    window.addEventListener("keydown", keydown);
    window.addEventListener("keyup", keyup);
    window.addEventListener("blur", release);
    document.addEventListener("visibilitychange", release);
    return () => {
      window.clearTimeout(resumeTimer);
      window.removeEventListener("keydown", keydown);
      window.removeEventListener("keyup", keyup);
      window.removeEventListener("blur", release);
      document.removeEventListener("visibilitychange", release);
    };
  }, []);
}
