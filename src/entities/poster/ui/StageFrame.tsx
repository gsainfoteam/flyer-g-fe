import { useEffect, useState, type ReactNode } from "react";
import { fromSeoulInput, getSeoulParts, toSeoulDateInputValue } from "@/shared/lib/datetime";
import {
  INFO_BAR_GAP,
  INFO_BAR_HEIGHT,
  TV_STAGE_PADDING,
  TV_STAGE_HEIGHT,
} from "@/entities/poster/ui/stage-metrics";
import "./stage-snow.css";

/**
 * TV 화면 틀: 본문(머리 줄 포함) 아래에 정보줄. 스테이지 여백 안에 두고 쓴다.
 *
 * 정보줄은 화면 폭을 다 쓰고 아래 끝에 붙는다. 아래 여백을 정보줄이 채우므로 틀의
 * 높이는 여백 안쪽보다 아래 여백만큼 길다. 본문 높이는 `STAGE_BODY_HEIGHT`와 같다.
 */
export function StageFrame({ children, bar }: { children: ReactNode; bar: ReactNode }) {
  return (
    <div
      className="flex flex-col"
      style={{ height: `calc(100% + ${TV_STAGE_PADDING}px)`, gap: INFO_BAR_GAP }}
    >
      <div className="relative min-h-0 flex-1">{children}</div>
      {/* 크게 보기·띠의 흐린 배경은 여백까지 번진다. 정보줄은 그 위에 둔다. */}
      <div
        className="relative z-10 shrink-0"
        style={{
          height: INFO_BAR_HEIGHT,
          marginLeft: -TV_STAGE_PADDING,
          marginRight: -TV_STAGE_PADDING,
        }}
      >
        <SeasonalSnow />
        {bar}
      </div>
    </div>
  );
}

function isSnowSeason(now: Date) {
  const { month } = getSeoulParts(now);
  return month === 12 || month === 1;
}

function SeasonalSnow() {
  const [visible, setVisible] = useState(() => isSnowSeason(new Date()));

  useEffect(() => {
    let timer: number;
    // 상시 켜 둔 TV에서도 서울 자정을 넘기면 장식을 바꾼다.
    function refresh() {
      const now = new Date();
      setVisible(isSnowSeason(now));
      const midnight = fromSeoulInput(toSeoulDateInputValue(now));
      const nextMidnight = midnight.getTime() + 24 * 60 * 60 * 1000;
      timer = window.setTimeout(refresh, nextMidnight - now.getTime());
    }
    refresh();
    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) return null;
  return (
    <div
      aria-hidden="true"
      className="stage-snow pointer-events-none absolute inset-x-0 bottom-full overflow-hidden"
      style={{ height: TV_STAGE_HEIGHT - INFO_BAR_HEIGHT }}
    >
      <svg className="absolute inset-x-0 bottom-0 h-6 w-full" viewBox="0 0 960 24" preserveAspectRatio="none">
        <path fill="#f0f7fc" d="M0 12 Q13 5 30 8 T65 12 Q80 12 96 16 T142 17 Q162 18 176 13 T214 11 Q235 16 261 14 T310 18 Q337 21 367 14 T411 10 Q429 7 449 12 T500 17 Q528 15 548 18 T601 15 Q620 8 643 11 T683 13 Q701 9 720 14 T770 18 Q799 20 818 12 T862 8 Q878 6 901 12 T941 12 Q952 10 960 11 V24 H0Z" />
      </svg>
    </div>
  );
}
