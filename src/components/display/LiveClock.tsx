import { useEffect, useState } from "react";
import { getSeoulParts } from "@/shared/lib/datetime";

/**
 * TV 화면의 현재 시각. 표시는 항상 Asia/Seoul 기준이다. (명세 6.3)
 * 기기의 시간대 설정과 무관하게 같은 시각을 보여준다.
 */
const pad = (value: number) => String(value).padStart(2, "0");

interface LiveClockProps {
  /** 테스트에서 고정 시각을 넣는다. */
  now?: Date;
}

export function LiveClock({ now }: LiveClockProps) {
  const [tick, setTick] = useState(() => now ?? new Date());

  useEffect(() => {
    if (now) return;
    const id = window.setInterval(() => setTick(new Date()), 1000);
    return () => window.clearInterval(id);
  }, [now]);

  const current = now ?? tick;
  const { year, month, day, weekday, hour12, minute, meridiem } =
    getSeoulParts(current);

  return (
    <div className="text-right">
      <p className="text-heading font-black text-ink-muted">
        {year}. {pad(month)}. {pad(day)}. ({weekday})
      </p>
      <p className="text-[2.25rem] font-black leading-tight tracking-tight text-ink">
        {hour12}:{pad(minute)} <span className="text-title">{meridiem}</span>
      </p>
    </div>
  );
}
