import { useEffect, useEffectEvent, useRef, useState } from "react";

export const MANUAL_PLAYBACK_HOLD_MS = 20_000;
export const PREVIOUS_PRESS_MS = 800;

/** Enter: 짧게 떼면 다음, 길게 누르면 이전. 방향키는 한 번 누를 때 한 번 이동. */
export function useDisplayKeyboard({
  enabled, onAdvance, onPrevious, onPauseChange,
}: {
  enabled: boolean;
  onAdvance: () => void;
  onPrevious: () => boolean;
  onPauseChange: (paused: boolean) => void;
}) {
  const [pressProgress, setPressProgress] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const cancelRef = useRef<((reset?: boolean) => void) | null>(null);
  const canInteract = useEffectEvent(() => enabled && document.visibilityState !== "hidden");
  const pause = useEffectEvent(() => onPauseChange(true));
  const advance = useEffectEvent(() => { onAdvance(); setFeedback("잠시 후 자동 재생"); });
  const previous = useEffectEvent(() => {
    setFeedback(onPrevious() ? "이전 화면 · 잠시 후 자동 재생" : "이전 화면이 없습니다");
  });
  const resume = useEffectEvent(() => { onPauseChange(false); setFeedback(null); });

  useEffect(() => {
    const held = new Set<string>();
    let press: { started: number; handled: boolean } | null = null;
    let longTimer: number | undefined;
    let progressTimer: number | undefined;
    let resumeTimer: number | undefined;
    const scheduleResume = () => {
      window.clearTimeout(resumeTimer);
      resumeTimer = window.setTimeout(resume, MANUAL_PLAYBACK_HOLD_MS);
    };
    const clearPress = () => {
      window.clearTimeout(longTimer);
      window.clearInterval(progressTimer);
      press = null;
      setPressProgress(null);
    };
    const cancel = (reset = false) => {
      if (press && !press.handled) scheduleResume();
      clearPress();
      if (reset) { window.clearTimeout(resumeTimer); resume(); }
    };
    cancelRef.current = cancel;
    const excluded = (event: KeyboardEvent) =>
      event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey ||
      event.shiftKey || event.isComposing ||
      (event.target instanceof Element && event.target.closest(
        'input, textarea, select, button, a[href], [contenteditable]:not([contenteditable="false"]), [role="button"], [role="textbox"]',
      ));
    const keydown = (event: KeyboardEvent) => {
      if (!["Enter", "ArrowRight", "ArrowLeft"].includes(event.key)) return;
      const alreadyHeld = held.has(event.key);
      held.add(event.key);
      if (excluded(event) || !canInteract()) return;
      event.preventDefault();
      if (event.repeat || alreadyHeld || press) return;
      pause();
      window.clearTimeout(resumeTimer);
      setFeedback(null);
      if (event.key !== "Enter") {
        if (event.key === "ArrowLeft") previous();
        else advance();
        scheduleResume();
        return;
      }
      press = { started: Date.now(), handled: false };
      setPressProgress(0);
      progressTimer = window.setInterval(() => {
        if (press) setPressProgress(Math.min(1, (Date.now() - press.started) / PREVIOUS_PRESS_MS));
      }, 40);
      longTimer = window.setTimeout(() => {
        if (!press) return;
        if (!canInteract()) { cancel(true); return; }
        press.handled = true;
        window.clearInterval(progressTimer);
        setPressProgress(1);
        previous();
        scheduleResume();
      }, PREVIOUS_PRESS_MS);
    };
    const keyup = (event: KeyboardEvent) => {
      held.delete(event.key);
      if (event.key !== "Enter" || !press) return;
      if (excluded(event) || !canInteract()) { cancel(); return; }
      event.preventDefault();
      if (!press.handled) {
        // 이벤트 루프가 바빠 임계 시각의 timer보다 keyup이 먼저 처리돼도 길이를 지킨다.
        if (Date.now() - press.started >= PREVIOUS_PRESS_MS) previous();
        else advance();
        scheduleResume();
      }
      clearPress();
    };
    const release = () => { held.clear(); cancel(); };
    window.addEventListener("keydown", keydown);
    window.addEventListener("keyup", keyup);
    window.addEventListener("blur", release);
    document.addEventListener("visibilitychange", release);
    return () => {
      window.clearTimeout(longTimer);
      window.clearInterval(progressTimer);
      window.clearTimeout(resumeTimer);
      cancelRef.current = null;
      window.removeEventListener("keydown", keydown);
      window.removeEventListener("keyup", keyup);
      window.removeEventListener("blur", release);
      document.removeEventListener("visibilitychange", release);
    };
  }, []);

  useEffect(() => {
    if (!enabled) cancelRef.current?.(true);
  }, [enabled]);
  return { pressProgress, feedback };
}
