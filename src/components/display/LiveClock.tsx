import { useEffect, useState } from "react";
import { getSeoulParts } from "@/shared/lib/datetime";
import { cn } from "@/shared/lib/utils";

/**
 * TV 화면의 현재 시각. 표시는 항상 Asia/Seoul 기준이다. (명세 6.3)
 * 기기의 시간대 설정과 무관하게 같은 시각을 보여준다.
 */
const pad = (value: number) => String(value).padStart(2, "0");

interface LiveClockProps {
  /** 서버 시각을 넘기면 그 값을 고정해서 보여준다. 테스트에서도 쓴다. */
  now?: Date;
  className?: string;
}

export function LiveClock({ now, className }: LiveClockProps) {
  const [tick, setTick] = useState(() => now ?? new Date());

  useEffect(() => {
    if (now) return;
    const id = window.setInterval(() => setTick(new Date()), 1000);
    return () => window.clearInterval(id);
  }, [now]);

  const current = now ?? tick;
  const { year, month, day, weekday, hour24, minute } = getSeoulParts(current);

  return (
    <p className={cn("tabular-nums text-ink-subtle", className)}>
      {year}. {pad(month)}. {pad(day)}. ({weekday}) {pad(hour24)}:{pad(minute)}
    </p>
  );
}
