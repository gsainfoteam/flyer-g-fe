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
  interaction?: { pressProgress: number | null; feedback: string | null };
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
  interaction,
}: StageInfoBarProps) {
  const sky = weather ? SKY_LABEL[weather.sky] : null;
  const air = airChip(weather);
  return (
    <div className="flex h-full items-center gap-8 overflow-hidden border-t border-line bg-surface px-[80px] text-[28px] whitespace-nowrap text-ink-muted tabular-nums">
      <LiveClock
        now={now ?? undefined}
        ticking={clockTicking || now === null}
        format="time"
        className="shrink-0 text-[40px] font-extrabold text-ink"
      />
      {weather && sky && (
        <span className="flex shrink-0 items-center gap-3">
          <sky.icon aria-hidden="true" strokeWidth={2} className={cn("size-8", sky.tone)} />
          <span className="font-bold text-ink">{weather.temperature}°</span>
          {sky.text}
        </span>
      )}
      {air && <span className={cn("shrink-0 font-bold", air.tone)}>{air.text}</span>}
      {/* 시계·날씨·경고는 유지하고, 가변 길이 안내가 남은 폭을 나눠 쓴다. */}
      {(meal || dday) && (
        <span className="flex min-w-0 flex-1 items-center gap-8">
          {meal && (
            <span title={meal} className="min-w-0 max-w-[360px] flex-[1.3] truncate text-ink">
              {meal}
            </span>
          )}
          {dday && (
            <span title={dday} className="min-w-0 max-w-[280px] flex-1 truncate">
              {dday}
            </span>
          )}
        </span>
      )}

      {interaction && (
        <span className="ml-auto flex shrink-0 flex-col gap-1 text-[20px] text-ink-muted">
          <span>{interaction.pressProgress !== null && interaction.pressProgress < 1
            ? "계속 누르면 이전으로 돌아가기"
            : "짧게: 다음 · 길게: 이전"}</span>
          {interaction.pressProgress !== null && (
            <span role="progressbar" aria-label="이전으로 돌아가기" aria-valuemin={0} aria-valuemax={100}
              aria-valuenow={Math.round(interaction.pressProgress * 100)}
              className="h-1.5 w-full overflow-hidden rounded-pill bg-surface-muted">
              <span className="block h-full origin-left bg-accent"
                style={{ transform: `scaleX(${interaction.pressProgress})` }} />
            </span>
          )}
        </span>
      )}
      {(status || next) && (
        <span className="ml-auto flex w-[420px] shrink-0 items-center gap-4">
          {status ? (
            <span title={status} className="min-w-0 truncate font-bold text-ink">{status}</span>
          ) : (
            next && (
              <>
                <span className="shrink-0">다음 ·</span>
                <span title={next.label} className="min-w-0 flex-1 truncate">{next.label}</span>
                <span className="h-1.5 w-[120px] shrink-0 overflow-hidden rounded-pill bg-surface-muted">
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
      )}
    </div>
  );
}
