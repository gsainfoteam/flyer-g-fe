import { StageHeader } from "@/entities/poster/ui/StageHeader";
import { STAGE_HEADER_GAP } from "@/entities/poster/ui/stage-metrics";
import { formatSeoulDateWithWeekday } from "@/shared/lib/datetime";
import type { WidgetContent, ZodiacFortune } from "@/entities/widget/model/content";

/**
 * 위젯 화면 한 장. 포스터 화면과 같은 머리 줄을 써서 전환해도 머리가 흔들리지 않는다.
 *
 * 2~5m 거리에서 몇 초 보는 화면이다. 핵심 숫자·단어 하나가 가장 크게 읽히게 한다.
 * 저사양 TV 브라우저에서 끊기지 않게 움직임은 두지 않는다. (명세 9.2)
 */
interface WidgetDisplayProps {
  content: WidgetContent;
  deviceLabel: string | null;
  serverTime: Date | null;
  clockTicking?: boolean;
}

export function WidgetDisplay({
  content,
  deviceLabel,
  serverTime,
  clockTicking = false,
}: WidgetDisplayProps) {
  return (
    <div className="flex h-full flex-col" style={{ gap: STAGE_HEADER_GAP }}>
      <StageHeader
        deviceLabel={deviceLabel}
        serverTime={serverTime}
        clockTicking={clockTicking}
      />
      <div className="flex min-h-0 flex-1 flex-col rounded-tv-card bg-surface px-[96px] py-[72px]">
        <WidgetBody content={content} />
      </div>
    </div>
  );
}

function Eyebrow({ children }: { children: string }) {
  return (
    <span className="self-start rounded-pill bg-accent px-[26px] py-2.5 text-[30px] font-bold text-accent-on">
      {children}
    </span>
  );
}

function WidgetBody({ content }: { content: WidgetContent }) {
  switch (content.type) {
    case "DDAY":
      return (
        <div className="flex flex-1 flex-col justify-center gap-10">
          <Eyebrow>D-day</Eyebrow>
          <p className="text-[64px] font-extrabold text-ink">{content.label}까지</p>
          <p className="text-[240px] leading-none font-extrabold tracking-tight text-ink tabular-nums">
            {content.days === 0 ? "D-DAY" : `D-${content.days}`}
          </p>
          <p className="text-[36px] text-ink-muted">
            {formatSeoulDateWithWeekday(content.targetDate)}
          </p>
        </div>
      );
    case "EXAM_CHEER":
      return (
        <div className="flex flex-1 flex-col justify-center gap-10">
          <Eyebrow>시험 응원</Eyebrow>
          <p className="text-[64px] font-extrabold text-ink">
            {content.phase === "before"
              ? `${content.label}까지 ${content.days}일`
              : `${content.label} ${content.days}일째`}
          </p>
          <p className="text-[96px] leading-tight font-extrabold tracking-tight text-ink">
            {content.message}
          </p>
        </div>
      );
    case "FORTUNE":
      return (
        <div className="flex min-h-0 flex-1 flex-col gap-8">
          <div className="flex items-baseline gap-8">
            <Eyebrow>오늘의 띠별 운세</Eyebrow>
            <p className="text-[30px] text-ink-subtle">재미로 보는 운세예요</p>
          </div>
          <ul className="grid min-h-0 flex-1 grid-cols-4 grid-rows-3 gap-5">
            {content.fortunes.map((fortune) => (
              <FortuneCell key={fortune.animal} fortune={fortune} />
            ))}
          </ul>
        </div>
      );
    case "MEAL_PICK":
      return (
        <div className="flex flex-1 flex-col justify-center gap-10">
          <Eyebrow>{content.meal === "LUNCH" ? "점심 메뉴 추천" : "저녁 메뉴 추천"}</Eyebrow>
          <p className="text-[56px] font-bold text-ink-muted">오늘은 이거 어때요?</p>
          <p className="text-[200px] leading-none font-extrabold tracking-tight text-ink">
            {content.menu}
          </p>
          <p className="text-[40px] text-ink-muted">
            아니면 {content.alternatives.join(" · ")}
          </p>
        </div>
      );
  }
}

function FortuneCell({ fortune }: { fortune: ZodiacFortune }) {
  return (
    <li className="flex min-h-0 flex-col justify-center gap-2 overflow-hidden rounded-tv-poster bg-surface-muted px-8 py-4">
      <p className="text-[32px] font-extrabold text-ink">
        <span aria-hidden="true">{fortune.emoji}</span> {fortune.animal}띠
      </p>
      <p className="line-clamp-2 text-[24px] leading-snug text-ink">{fortune.message}</p>
      <p className="text-[22px] text-ink-subtle">행운의 색 · {fortune.luckyColor}</p>
    </li>
  );
}
