import type { PosterRenderModel } from "@/entities/poster";
import type { DisplayFrame } from "@/entities/poster/model/frames";
import { SpotlightDisplay } from "@/entities/poster/ui/SpotlightDisplay";
import { StripDisplay } from "@/entities/poster/ui/StripDisplay";
import { WallDisplay } from "@/entities/poster/ui/WallDisplay";

/**
 * TV 화면 한 장의 내용.
 *
 * 플레이어(`/display/:deviceId`)와 게시 신청 미리보기가 **같은 컴포넌트**를 쓴다.
 * 미리보기 전용 구현을 따로 두면 실제 TV와 다르게 보이고, 그 차이는 승인 뒤에야
 * 드러난다. (명세 FR-SUB-03)
 *
 * 바깥 여백과 배경, 화면 크기에 맞춘 축소는 `ScaledStage`가 맡는다. 여기서는
 * 여백 안쪽만 1920x1080 기준 px로 그린다.
 */
interface DisplayStageProps {
  frame: DisplayFrame;
  /** 편성 전체. 띠는 전체를 이어 붙이고, 벽은 게시 건수를 센다. */
  posters: PosterRenderModel[];
  /** TV 머리의 기기 이름. 모르면 비운다. */
  deviceLabel: string | null;
  /** 편성 판정의 기준이 되는 서버 시각. 모르면 시계는 기기 시각으로 흐른다. */
  serverTime: Date | null;
  /** 시계를 서버 시각 기준으로 흐르게 한다. 운영 TV에서 켠다. */
  clockTicking?: boolean;
  /** 이미지를 불러오지 못했을 때. 플레이어가 항목을 건너뛰는 데 쓴다. */
  onPosterError?: (posterId: string) => void;
  /** 이미지가 그려졌을 때. 플레이어가 정상 렌더링을 보고하는 데 쓴다. */
  onPosterLoad?: (posterId: string) => void;
}

export function DisplayStage({
  frame,
  posters,
  deviceLabel,
  serverTime,
  clockTicking = false,
  onPosterError,
  onPosterLoad,
}: DisplayStageProps) {
  const common = {
    deviceLabel,
    serverTime,
    clockTicking,
    onPosterError,
    onPosterLoad,
  };

  switch (frame.kind) {
    case "wall":
      return (
        <WallDisplay
          posters={frame.posters}
          totalCount={posters.length}
          {...common}
        />
      );
    case "spotlight":
      return (
        <SpotlightDisplay
          poster={frame.poster}
          upNext={frame.upNext}
          {...common}
        />
      );
    case "strip":
      return (
        <StripDisplay
          posters={posters}
          focusIndex={frame.focusIndex}
          {...common}
        />
      );
  }
}
