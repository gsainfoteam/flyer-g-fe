import type { WeatherContent } from "@/entities/widget/model/data-content";
import { SKY_LABEL } from "./sky";

/**
 * TV 머리 줄의 작은 날씨. 시계 옆에 늘 떠 있어 날씨 위젯이 가끔만 나와도 된다.
 * 1920x1080 기준 px이다.
 */
export function HeaderWeather({ weather }: { weather: WeatherContent }) {
  const { icon: Icon, tone, text } = SKY_LABEL[weather.sky];
  return (
    <span className="flex items-center gap-2.5 text-[30px] text-ink-muted tabular-nums">
      <Icon aria-hidden="true" strokeWidth={2} className={`size-8 ${tone}`} />
      <span className="font-bold text-ink">{weather.temperature}°</span>
      <span className="sr-only">{text}</span>
    </span>
  );
}
