import type { ReactNode } from "react";
import { StageHeader } from "@/entities/poster/ui/StageHeader";
import { STAGE_HEADER_GAP } from "@/entities/poster/ui/stage-metrics";
import { formatSeoulDateWithWeekday } from "@/shared/lib/datetime";
import type { WidgetContent, ZodiacFortune } from "@/entities/widget/model/content";
import type {
  AirGrade,
  CafeteriaContent,
  CafeteriaMeal,
  MealType,
  RestaurantContent,
  Sky,
  WeatherContent,
} from "@/entities/widget/model/data-content";
import { CHOICE_MARKS } from "@/entities/widget/model/quiz";
import { RELATION_LABEL } from "@/entities/widget/model/saju";
import { QRCodeBox } from "@/shared/components/QRCodeBox";
import { to } from "@/shared/config/routes";
import { getSeoulParts } from "@/shared/lib/datetime";
import { cn } from "@/shared/lib/utils";
import { SKY_LABEL } from "./sky";

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
  const dense = content.type === "CAFETERIA" || content.type === "FORTUNE" || content.type === "QUIZ";
  return (
    <div className="flex h-full flex-col" style={{ gap: STAGE_HEADER_GAP }}>
      <StageHeader
        deviceLabel={deviceLabel}
        serverTime={serverTime}
        clockTicking={clockTicking}
      />
      <div className={cn(
        "flex min-h-0 flex-1 flex-col rounded-tv-card bg-surface",
        dense ? "px-[80px] py-[56px]" : "px-[96px] py-[72px]",
      )}>
        <WidgetBody content={content} />
      </div>
    </div>
  );
}

/** 설문 QR. 지나가며 찍기 쉽게 QR을 크게, 글은 짧게 둔다. */
function SurveyBody({ content }: { content: Extract<WidgetContent, { type: "SURVEY" }> }) {
  return (
    <div className="flex min-h-0 flex-1 items-center gap-24">
      <div className="flex min-w-0 flex-1 flex-col gap-10">
        <Eyebrow>설문</Eyebrow>
        <p className="text-[80px] leading-tight font-extrabold tracking-tight text-ink">
          {content.title}
        </p>
        {content.description && (
          <p className="text-[40px] leading-snug text-ink-muted">{content.description}</p>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-center gap-6">
        <QRCodeBox value={content.url} size="tv" />
        <p className="text-[38px] font-extrabold text-ink">폰으로 참여하기</p>
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

function WidgetBody({ content }: { content: WidgetContent }): ReactNode {
  switch (content.type) {
    case "DDAY":
      return (
        <div className="flex flex-1 flex-col justify-center gap-10">
          <Eyebrow>D-day</Eyebrow>
          <p className="line-clamp-2 text-[64px] leading-tight font-extrabold text-ink">
            {content.label}까지
          </p>
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
            <p className="text-[34px] font-bold text-ink-muted">
              오늘은 {content.dayPillar.name}일
              <span className="ml-3 font-normal text-ink-subtle">
                {content.dayPillar.hanja}日
              </span>
            </p>
            <p className="ml-auto text-[26px] text-ink-subtle">
              띠와 일진의 합·충으로 보는 재미용 운세
            </p>
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
    case "CAFETERIA":
      return <CafeteriaBody content={content} />;
    case "WEATHER":
      return <WeatherBody content={content} />;
    case "RESTAURANT":
      return <RestaurantBody content={content} />;
    case "QUIZ":
      return <QuizBody content={content} />;
    case "CLICK_BATTLE":
    case "SHUFFLEBOARD":
    case "FLYER_DODGE":
      // 게임 방을 여는 화면이라 플레이어가 따로 그린다(GameFrame).
      return null;
    case "SURVEY":
      return <SurveyBody content={content} />;
  }
}

function QuizBody({ content }: { content: Extract<WidgetContent, { type: "QUIZ" }> }) {
  const { quiz, yesterday } = content;
  // 폰은 TV와 같은 주소로 들어온다. 날짜를 실어 자정을 넘겨도 같은 문제를 푼다.
  const playUrl = `${window.location.origin}${to.playQuiz(content.dateKey)}`;
  return (
    <div className="flex min-h-0 flex-1 gap-16">
      <div className="flex min-w-0 flex-1 flex-col gap-10">
        <Eyebrow>오늘의 퀴즈</Eyebrow>
        <p className="text-[72px] leading-tight font-extrabold tracking-tight text-ink">
          {quiz.question}
        </p>
        <ol className="grid grid-cols-2 gap-5">
          {quiz.choices.map((choice, index) => (
            <li
              key={choice}
              className="flex items-center gap-5 rounded-tv-poster bg-surface-muted px-8 py-6 text-[44px] font-bold text-ink"
            >
              <span className="text-ink-subtle">{CHOICE_MARKS[index]}</span>
              {choice}
            </li>
          ))}
        </ol>
        <p className="mt-auto truncate text-[30px] text-ink-muted">
          어제의 정답 · {yesterday.question}{" "}
          <span className="font-bold text-ink">
            {CHOICE_MARKS[yesterday.answerIndex]} {yesterday.choices[yesterday.answerIndex]}
          </span>
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-center justify-center gap-6">
        <QRCodeBox value={playUrl} size="tv" />
        <p className="text-[38px] font-extrabold text-ink">폰으로 답하기</p>
        <p className="text-[26px] text-ink-muted">정답은 내일 공개</p>
      </div>
    </div>
  );
}

const MEAL_LABEL: Record<MealType, string> = {
  BREAKFAST: "아침",
  LUNCH: "점심",
  DINNER: "저녁",
};

/** 끼니마다 보여 줄 메뉴 수. 넘치면 "외 N가지"로 줄인다. 카드 높이에 맞춘 값이다. */
const MAX_MENUS = 7;

/** 메뉴 목록. `limit`을 넘으면 "외 N가지"로 줄인다. */
function MenuList({
  menus,
  limit,
  isCurrent,
}: {
  menus: readonly string[];
  limit: number;
  isCurrent: boolean;
}) {
  return (
    <ul
      className={cn(
        "flex flex-col gap-2 text-[34px] leading-tight",
        isCurrent ? "font-bold text-ink" : "text-ink-muted",
      )}
    >
      {menus.slice(0, limit).map((menu) => (
        <li key={menu} className="truncate">
          {menu}
        </li>
      ))}
      {menus.length > limit && (
        <li className="text-ink-subtle">외 {menus.length - limit}가지</li>
      )}
    </ul>
  );
}

/**
 * 일품·한식처럼 코너가 나뉜 끼니. 코너를 나란히 두 열로 둔다. 이 끼니 칸은 두 배로
 * 넓혀(CafeteriaBody) 열마다 다른 끼니 칸만큼의 폭을 가진다. 그래서 줄이지 않고 다 보인다.
 */
function CornerMenus({
  corners,
  isCurrent,
}: {
  corners: NonNullable<CafeteriaMeal["corners"]>;
  isCurrent: boolean;
}) {
  return (
    <div
      className="grid min-h-0 flex-1 gap-8"
      style={{ gridTemplateColumns: `repeat(${corners.length}, minmax(0, 1fr))` }}
    >
      {corners.map((corner, index) => (
        <div
          key={corner.name}
          className={cn("flex min-w-0 flex-col gap-1", index > 0 && "border-l-2 border-line pl-8")}
        >
          <p className={cn("text-[28px] font-extrabold", isCurrent ? "text-accent" : "text-ink-subtle")}>
            {corner.name}
          </p>
          <MenuList menus={corner.menus} limit={MAX_MENUS} isCurrent={isCurrent} />
        </div>
      ))}
    </div>
  );
}

/** 학식 위젯 본문. 끼니마다 한 칸, 코너가 나뉜 끼니는 두 배 폭 칸이다. */
function CafeteriaBody({ content }: { content: CafeteriaContent }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-10">
      <div className="flex items-baseline gap-8">
        <Eyebrow>오늘의 학식</Eyebrow>
        <p className="text-[34px] font-bold text-ink-muted">{content.place}</p>
      </div>
      <ul
        className="grid min-h-0 flex-1 gap-8"
        // 코너가 나뉜 끼니(점심 일품·한식)는 두 배 폭으로 두 열을 담는다.
        style={{
          gridTemplateColumns: content.meals
            .map((meal) => `minmax(0, ${meal.corners ? 2 : 1}fr)`)
            .join(" "),
        }}
      >
        {content.meals.map((meal) => {
          const isCurrent = meal.type === content.current;
          return (
            <li
              key={meal.type}
              className={cn(
                "flex min-h-0 flex-col gap-4 overflow-hidden rounded-tv-poster px-8 py-6",
                "bg-surface-muted",
                // TV는 어두운 면이라 옅은 강조 배경이 조명처럼 튄다. 테두리로만 짚는다.
                isCurrent && "ring-4 ring-accent",
              )}
            >
              <div className="flex items-baseline gap-4">
                <p
                  className={cn(
                    "text-[48px] font-extrabold",
                    isCurrent ? "text-accent" : "text-ink",
                  )}
                >
                  {MEAL_LABEL[meal.type]}
                </p>
                {meal.hours && (
                  <p
                    className={cn(
                      "text-[26px] tabular-nums",
                      "text-ink-subtle",
                    )}
                  >
                    {meal.hours}
                  </p>
                )}
              </div>
              {meal.corners ? (
                <CornerMenus corners={meal.corners} isCurrent={isCurrent} />
              ) : (
                <MenuList menus={meal.menus} limit={MAX_MENUS} isCurrent={isCurrent} />
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}



function WeatherBody({ content }: { content: WeatherContent }) {
  const sky = SKY_LABEL[content.sky];
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-10">
      <div className="flex items-baseline gap-8">
        <Eyebrow>오늘 날씨</Eyebrow>
        {content.location && (
          <p className="text-[34px] font-bold text-ink-muted">{content.location}</p>
        )}
        {content.source && (
          <p className="ml-auto text-[24px] text-ink-subtle">{content.source}</p>
        )}
      </div>
      <div className="flex flex-1 items-center gap-24">
        <div className="flex items-center gap-10">
          <sky.icon aria-hidden="true" strokeWidth={1.5} className={cn("size-[180px]", sky.tone)} />
          <div>
            <p className="text-[180px] leading-none font-extrabold tracking-tight text-ink tabular-nums">
              {content.temperature}°
            </p>
            <p className="mt-4 text-[44px] font-bold text-ink">{sky.text}</p>
          </div>
        </div>
        <dl className="grid grid-cols-[auto_auto] gap-x-10 gap-y-5 text-[40px]">
          <dt className="text-ink-subtle">최고 / 최저</dt>
          <dd className="font-extrabold text-ink tabular-nums">
            {content.high}° / {content.low}°
          </dd>
          <dt className="text-ink-subtle">강수확률</dt>
          <dd className="font-extrabold text-ink tabular-nums">
            {content.precipitationChance}%
          </dd>
          {content.air?.pm10 && (
            <>
              <dt className="text-ink-subtle">미세먼지</dt>
              <dd className={cn("font-extrabold", AIR_LABEL[content.air.pm10].tone)}>
                {AIR_LABEL[content.air.pm10].text}
              </dd>
            </>
          )}
          {content.air?.pm25 && (
            <>
              <dt className="text-ink-subtle">초미세먼지</dt>
              <dd className={cn("font-extrabold", AIR_LABEL[content.air.pm25].tone)}>
                {AIR_LABEL[content.air.pm25].text}
              </dd>
            </>
          )}
        </dl>
      </div>
      {content.hourly.length > 0 && (
        <ul className="grid grid-cols-6 gap-5">
          {content.hourly.map((hour) => (
            <li
              key={hour.at.getTime()}
              className="flex flex-col items-center gap-2 rounded-tv-poster bg-surface-muted py-5"
            >
              <span className="text-[26px] text-ink-subtle tabular-nums">
                {getSeoulParts(hour.at).hour24}시
              </span>
              <HourIcon sky={hour.sky} />
              <span className="text-[32px] font-bold text-ink tabular-nums">
                {hour.temperature}°
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const AIR_LABEL: Record<AirGrade, { text: string; tone: string }> = {
  GOOD: { text: "좋음", tone: "text-success" },
  NORMAL: { text: "보통", tone: "text-ink" },
  BAD: { text: "나쁨", tone: "text-warning" },
  VERY_BAD: { text: "매우 나쁨", tone: "text-danger" },
};

function HourIcon({ sky }: { sky: Sky }) {
  const { icon: Icon, tone } = SKY_LABEL[sky];
  return <Icon aria-hidden="true" strokeWidth={2} className={cn("size-10", tone)} />;
}

/** 이 길이를 넘는 가게 이름은 한 단계 작게 써서 두 줄 안에 담는다. */
const LONG_PLACE_NAME = 9;

function RestaurantBody({ content }: { content: RestaurantContent }) {
  const { featured } = content;
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-10">
      <Eyebrow>근처 맛집</Eyebrow>
      <div className="flex min-h-0 flex-1 items-center gap-16">
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-6">
          {featured.category && (
            <p className="text-[40px] font-bold text-ink-muted">{featured.category}</p>
          )}
          <p
            className={cn(
              "line-clamp-2 leading-[1.05] font-extrabold tracking-tight text-ink",
              featured.name.length > LONG_PLACE_NAME ? "text-[110px]" : "text-[150px]",
            )}
          >
            {featured.name}
          </p>
          {featured.address && (
            <p className="text-[36px] text-ink-muted">{featured.address}</p>
          )}
        </div>
        {/* 원본 링크가 있으면 QR. TV는 누를 수 없어 폰으로 원본(지도·리뷰)을 연다. */}
        {featured.url && (
          <div className="flex shrink-0 flex-col items-center gap-4">
            <QRCodeBox value={featured.url} size="tv" />
            <p className="text-[30px] font-extrabold text-ink">자세히 보기</p>
          </div>
        )}
      </div>
      <div className="flex items-end justify-between gap-10">
        {content.others.length > 0 && (
          <p className="min-w-0 truncate text-[34px] text-ink-muted">
            다른 장소 · {content.others.map((place) => place.name).join(" · ")}
          </p>
        )}
        {content.source && (
          <p className="ml-auto shrink-0 text-[24px] text-ink-subtle">{content.source}</p>
        )}
      </div>
    </div>
  );
}

function FortuneCell({ fortune }: { fortune: ZodiacFortune }) {
  return (
    <li className="flex min-h-0 flex-col justify-center gap-2 overflow-hidden rounded-tv-poster bg-surface-muted px-8 py-4">
      <p className="flex items-baseline gap-3 text-[32px] font-extrabold text-ink">
        {fortune.animal}띠
        {RELATION_LABEL[fortune.relation] && (
          <span
            className={cn(
              "text-[22px] font-bold",
              fortune.relation === "CLASH" ? "text-warning" : "text-success",
            )}
          >
            {RELATION_LABEL[fortune.relation]}
          </span>
        )}
      </p>
      <p className="line-clamp-2 text-[24px] leading-snug text-ink">{fortune.message}</p>
      <p className="text-[22px] text-ink-subtle">행운의 색 · {fortune.luckyColor}</p>
    </li>
  );
}
