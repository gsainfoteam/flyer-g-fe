import type { ReactNode } from "react";
import {
  INFO_BAR_GAP,
  INFO_BAR_HEIGHT,
  TV_STAGE_PADDING,
} from "@/entities/poster/ui/stage-metrics";

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
        {bar}
      </div>
    </div>
  );
}
