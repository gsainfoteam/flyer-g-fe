import { useCallback, useEffect, useRef, useState } from "react";

/**
 * 쓰지 않는 폰의 게임 연결을 쉬게 한다.
 *
 * 백엔드 게임 중계는 한 IP가 한 TV 방에 둘 수 있는 연결 수를 묶어 둔다(12개). 기숙사
 * 와이파이처럼 여러 학생이 같은 IP로 나가면, 판을 끝내고 화면만 켜 둔 폰들이 자리를
 * 차지해 새로 QR을 찍은 학생이 못 들어온다. 그래서
 *
 * - 판에 참가하지 않은 채 `idleMs` 동안 손대지 않으면 쉬고,
 * - 화면이 `hiddenMs` 넘게 가려져 있으면(주머니 속, 다른 앱) 쉰다.
 *
 * 화면을 다시 보거나 손대면(`resume`) 바로 다시 붙는다.
 */
export const IDLE_PAUSE = { idleMs: 90_000, hiddenMs: 20_000, checkMs: 5_000 } as const;

export function useIdlePause(participating: boolean) {
  const [paused, setPaused] = useState(false);
  const activeAtRef = useRef(0);
  const hiddenAtRef = useRef<number | null>(null);
  const participatingRef = useRef(participating);
  useEffect(() => {
    participatingRef.current = participating;
    if (participating) activeAtRef.current = Date.now();
  }, [participating]);

  const resume = useCallback(() => {
    activeAtRef.current = Date.now();
    setPaused(false);
  }, []);

  useEffect(() => {
    activeAtRef.current = Date.now();
    const touched = () => {
      activeAtRef.current = Date.now();
    };
    const visibility = () => {
      if (document.visibilityState === "hidden") {
        hiddenAtRef.current = Date.now();
      } else {
        hiddenAtRef.current = null;
        resume();
      }
    };
    const check = window.setInterval(() => {
      const now = Date.now();
      const hiddenLong = hiddenAtRef.current !== null && now - hiddenAtRef.current >= IDLE_PAUSE.hiddenMs;
      const idleLong = !participatingRef.current && now - activeAtRef.current >= IDLE_PAUSE.idleMs;
      if (hiddenLong || idleLong) setPaused(true);
    }, IDLE_PAUSE.checkMs);
    window.addEventListener("pointerdown", touched);
    window.addEventListener("keydown", touched);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.clearInterval(check);
      window.removeEventListener("pointerdown", touched);
      window.removeEventListener("keydown", touched);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [resume]);

  return { paused, resume };
}
