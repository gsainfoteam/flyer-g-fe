import type { LayoutType } from "@/entities/playlist/model/types";
import type { PosterRenderModel } from "@/entities/poster";
import { Logo } from "../common/Logo";
import { FourSplitDisplay } from "./FourSplitDisplay";
import { LiveClock } from "./LiveClock";
import { SinglePosterDisplay } from "./SinglePosterDisplay";

/**
 * TV 화면 한 판의 내용.
 *
 * 플레이어(`/display/:deviceId`)와 게시 신청 미리보기가 **같은 컴포넌트**를 쓴다.
 * 미리보기 전용 구현을 따로 두면 실제 TV와 다르게 보이고, 그 차이는 승인 뒤에야
 * 드러난다. (명세 FR-SUB-03)
 *
 * 바깥 여백과 배경은 `DisplayStageSurface`가 맡는다. 여기서는 여백 안쪽만 그린다.
 * 치수는 1920x1080 기준 고정 px이며, 축소는 감싸는 쪽이 한다.
 */
export const TV_STAGE_WIDTH = 1920;
export const TV_STAGE_HEIGHT = 1080;
/** 화면 가장자리 안전 여백. TV 오버스캔과 베젤을 감안한 값이다. */
export const TV_STAGE_PADDING = 80;

interface DisplayStageProps {
  layout: LayoutType;
  posters: PosterRenderModel[];
  /** SINGLE에서 지금 보여줄 항목 */
  currentIndex?: number;
  deviceLabel: string;
  /** 편성 판정의 기준이 되는 서버 시각 */
  serverTime: Date;
}

export function DisplayStage({
  layout,
  posters,
  currentIndex = 0,
  deviceLabel,
  serverTime,
}: DisplayStageProps) {
  if (posters.length === 0) return null;

  if (layout === "FOUR_GRID") {
    return (
      <div className="flex h-full flex-col">
        <div className="flex shrink-0 items-center gap-4 pb-8">
          <Logo size="lg" />
          <span className="text-[26px] text-ink-subtle">
            {deviceLabel} · 게시 중 {posters.length}건
          </span>
          <LiveClock now={serverTime} className="ml-auto text-[30px]" />
        </div>
        <div className="min-h-0 flex-1">
          <FourSplitDisplay posters={posters} />
        </div>
      </div>
    );
  }

  const current = posters[currentIndex % posters.length]!;
  return (
    <SinglePosterDisplay
      poster={current}
      deviceLabel={deviceLabel}
      serverTime={serverTime}
    />
  );
}
