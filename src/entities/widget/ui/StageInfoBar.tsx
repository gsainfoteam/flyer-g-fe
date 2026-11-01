import type { WeatherContent } from "@/entities/widget/model/data-content";
import { LiveClock } from "@/shared/components/LiveClock";
import { cn } from "@/shared/lib/utils";
import { SKY_LABEL } from "./sky";

/**
 * TV 아래 정보줄. "지금 무엇인지"를 왼쪽부터 중요한 순서로 둔다.
 *
 *   시각 · 날씨 · (미세먼지 나쁨) · 식사 · D-day          다음 · ○○ ▬▬▬
 *
 * 칩은 값이 있을 때만 나온다. 같은 내용의 위젯이 화면을 채우는 동안에는 호출부가
 * 그 칩을 넘기지 않는다(날씨·학식). 날씨 출처는 날씨 위젯에만 적는다.
 * 1920x1080 기준 px이며 화면 폭을 다 쓴다(`StageFrame`).
 */
export interface StageInfoNext {
  label: string;
  /** 지금 화면이 머무는 시간(초). 진행 막대가 이 시간 동안 찬다. */
  seconds: number;
  /** 화면이 바뀔 때마다 달라지는 값. 진행 막대를 처음부터 다시 채운다. */
  key: string;
}

interface StageInfoBarProps {
  now: Date | null;
  clockTicking?: boolean;
  weather?: WeatherContent | null;
  meal?: string | null;
  dday?: string | null;
  /** 다음 화면. 넘어가지 않는 동안(일시정지·게임)에는 없다. */
  next?: StageInfoNext | null;
  /** 다음 화면 대신 보여 줄 상태(게임 중 등) */
  status?: string | null;
}

/** 미세먼지·초미세먼지 중 나쁜 쪽이 "나쁨" 이상일 때만 칩을 띄운다. */
function airChip(weather: WeatherContent | null | undefined) {
  const grades = [weather?.air?.pm10, weather?.air?.pm25];
  if (grades.includes("VERY_BAD")) return { text: "미세먼지 매우 나쁨", tone: "text-danger" };
  if (grades.includes("BAD")) return { text: "미세먼지 나쁨", tone: "text-warning" };
  return null;
}

export function StageInfoBar({
  now,
  clockTicking = false,
  weather,
  meal,
  dday,
  next,
  status,
}: StageInfoBarProps) {
  const sky = weather ? SKY_LABEL[weather.sky] : null;
  const air = airChip(weather);
  return (
    <div className="flex h-full items-center gap-10 border-t border-line bg-surface px-[80px] text-[28px] whitespace-nowrap text-ink-muted tabular-nums">
      <LiveClock
        now={now ?? undefined}
        ticking={clockTicking || now === null}
        format="time"
        className="text-[40px] font-extrabold text-ink"
      />
      {weather && sky && (
        <span className="flex items-center gap-3">
          <sky.icon aria-hidden="true" strokeWidth={2} className={cn("size-8", sky.tone)} />
          <span className="font-bold text-ink">{weather.temperature}°</span>
          {sky.text}
        </span>
      )}
      {air && <span className={cn("font-bold", air.tone)}>{air.text}</span>}
      {meal && <span className="text-ink">{meal}</span>}
      {dday && <span>{dday}</span>}

      <span className="ml-auto flex min-w-0 items-center gap-5">
        {status ? (
          <span className="font-bold text-ink">{status}</span>
        ) : (
          next && (
            <>
              <span className="min-w-0 truncate">다음 · {next.label}</span>
              <span className="h-1.5 w-[200px] shrink-0 overflow-hidden rounded-pill bg-surface-muted">
                <span
                  key={next.key}
                  className="block h-full origin-left bg-accent"
                  style={{ animation: `tv-info-progress ${next.seconds}s linear forwards` }}
                />
              </span>
            </>
          )
        )}
      </span>
    </div>
  );
}
