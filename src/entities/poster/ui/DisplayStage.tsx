import type { LayoutType } from "@/entities/playlist/model/types";
import type { PosterRenderModel } from "@/entities/poster";
import { Logo } from "@/shared/components/Logo";
import { FourSplitDisplay } from "@/entities/poster/ui/FourSplitDisplay";
import { LiveClock } from "@/shared/components/LiveClock";
import { SinglePosterDisplay } from "@/entities/poster/ui/SinglePosterDisplay";

/**
 * TV 화면 한 판의 내용.
 *
 * 플레이어(`/display/:deviceId`)와 게시 신청 미리보기가 **같은 컴포넌트**를 쓴다.
 * 미리보기 전용 구현을 따로 두면 실제 TV와 다르게 보이고, 그 차이는 승인 뒤에야
 * 드러난다. (명세 FR-SUB-03)
 *
 * 바깥 여백과 배경, 화면 크기에 맞춘 축소는 `ScaledStage`가 맡는다. 여기서는
 * 여백 안쪽만 1920x1080 기준 px로 그린다.
 */
interface DisplayStageProps {
  layout: LayoutType;
  /** 지금 페이지에 그릴 포스터 */
  posters: PosterRenderModel[];
  /** 편성 전체의 게시 건수. 4분할은 여러 페이지로 나뉘므로 페이지 수와 다르다. */
  totalCount?: number;
  /** SINGLE에서 지금 보여줄 항목 */
  currentIndex?: number;
  /** TV 머리의 기기 이름. 모르면 비운다. */
  deviceLabel: string | null;
  /** 편성 판정의 기준이 되는 서버 시각. 모르면 시계는 기기 시각으로 흐른다. */
  serverTime: Date | null;
  /** 시계를 서버 시각 기준으로 흐르게 한다. 운영 TV에서 켠다. */
  clockTicking?: boolean;
  /** 포스터 이미지를 불러오지 못했을 때. 플레이어가 항목을 건너뛰는 데 쓴다. */
  onPosterError?: (posterId: string) => void;
  /** 포스터 이미지가 그려졌을 때. 플레이어가 정상 렌더링을 보고하는 데 쓴다. */
  onPosterLoad?: (posterId: string) => void;
}

export function DisplayStage({
  layout,
  posters,
  totalCount = posters.length,
  currentIndex = 0,
  deviceLabel,
  serverTime,
  clockTicking = false,
  onPosterError,
  onPosterLoad,
}: DisplayStageProps) {
  if (posters.length === 0) return null;

  if (layout === "FOUR_GRID") {
    return (
      <div className="flex h-full flex-col">
        <div className="flex shrink-0 items-center gap-4 pb-8">
          <Logo size="lg" />
          <span className="text-[26px] text-ink-subtle">
            {deviceLabel && `${deviceLabel} · `}게시 중 {totalCount}건
          </span>
          <LiveClock
            now={serverTime ?? undefined}
            ticking={clockTicking || serverTime === null}
            className="ml-auto text-[30px]"
          />
        </div>
        <div className="min-h-0 flex-1">
          <FourSplitDisplay
            posters={posters}
            onPosterError={onPosterError}
            onPosterLoad={onPosterLoad}
          />
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
      clockTicking={clockTicking}
      onPosterError={onPosterError}
      onPosterLoad={onPosterLoad}
    />
  );
}
