import { useEffect, useState } from "react";
import { temporaryBattleScheduleAt } from "./temporary-battle-schedule";

/** 서버 시각을 흘려 쓰며, 편성 폴링 없이도 18:00/20:00 경계에 전환한다. */
export function useTemporaryBattleWindow(serverTime: Date | null): boolean {
  const [snapshot, setSnapshot] = useState<{ source: Date | null; active: boolean }>({ source: null, active: false });

  useEffect(() => {
    if (!serverTime) return;
    const offset = serverTime.getTime() - Date.now();
    let timer: number | undefined;
    const update = () => {
      window.clearTimeout(timer);
      const now = new Date(Date.now() + offset);
      const schedule = temporaryBattleScheduleAt(now);
      setSnapshot({ source: serverTime, active: schedule.active });
      // 먼 날짜와 기기 절전·시계 보정에 대비하되, 행사가 끝나면 timer도 멈춘다.
      if (schedule.nextChangeAt !== null) {
        timer = window.setTimeout(update, Math.min(schedule.nextChangeAt - now.getTime(), 5 * 60_000));
      }
    };
    update();
    document.addEventListener("visibilitychange", update);
    window.addEventListener("focus", update);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", update);
      window.removeEventListener("focus", update);
    };
  }, [serverTime]);

  // 새 서버 응답은 effect를 기다리지 않고 적용해, 행사 시작 때 포스터가 잠깐 보이거나
  // 시각 보정 뒤 이전 상태가 한 프레임 남는 것을 막는다.
  return serverTime !== null && (
    snapshot.source === serverTime ? snapshot.active : temporaryBattleScheduleAt(serverTime).active
  );
}
