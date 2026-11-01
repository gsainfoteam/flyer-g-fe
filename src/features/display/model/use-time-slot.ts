import { useEffect, useState } from "react";
import { TIME_SLOTS } from "@/entities/widget/model/operation";
import type { TimeSlotRule } from "@/entities/widget/model/operation";
import { timeSlotAt } from "@/entities/widget/model/time-slots";

export interface ActiveTimeSlot {
  rule: TimeSlotRule;
  /** 끝나는 시각(ms) */
  endsAt: number;
}

const snapshotOf = (rules: readonly TimeSlotRule[], now: Date): ActiveTimeSlot | null => {
  const state = timeSlotAt(rules, now);
  return state.rule && state.endsAt !== null ? { rule: state.rule, endsAt: state.endsAt } : null;
};

/**
 * 지금 점유 중인 시간대. 규칙은 관리 화면 설정(`useTimeSlotRules`), 없으면 `TIME_SLOTS`. 서버 시각을 흘려 쓰며, 편성
 * 폴링을 기다리지 않고 경계 시각에 전환한다. 절전·포커스 복귀 때 다시 판정하고, 모든
 * 시간대가 끝나면 timer도 멈춘다.
 */
export function useTimeSlot(
  serverTime: Date | null,
  rules: readonly TimeSlotRule[] = TIME_SLOTS,
): ActiveTimeSlot | null {
  const [snapshot, setSnapshot] = useState<{
    source: Date | null;
    rules: readonly TimeSlotRule[] | null;
    active: ActiveTimeSlot | null;
  }>({ source: null, rules: null, active: null });

  useEffect(() => {
    if (!serverTime) return;
    const offset = serverTime.getTime() - Date.now();
    let timer: number | undefined;
    const update = () => {
      window.clearTimeout(timer);
      const now = new Date(Date.now() + offset);
      const state = timeSlotAt(rules, now);
      setSnapshot({ source: serverTime, rules, active: snapshotOf(rules, now) });
      // 먼 날짜와 기기 절전·시계 보정에 대비해 5분마다도 다시 본다.
      if (state.nextChangeAt !== null) {
        timer = window.setTimeout(
          update,
          Math.min(state.nextChangeAt - now.getTime(), 5 * 60_000),
        );
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
  }, [serverTime, rules]);

  // 새 서버 응답은 effect를 기다리지 않고 적용해, 시작 때 포스터가 잠깐 보이거나 시각 보정
  // 뒤 이전 상태가 한 프레임 남는 것을 막는다.
  if (!serverTime) return null;
  return snapshot.source === serverTime && snapshot.rules === rules
    ? snapshot.active
    : snapshotOf(rules, serverTime);
}
