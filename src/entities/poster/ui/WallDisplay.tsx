import type { PosterRenderModel } from "@/entities/poster";
import { hasKnownSize } from "@/entities/poster/model/types";
import {
  layoutWallPage,
  WALL_METRICS,
} from "@/entities/poster/model/wall-layout";
import { PosterArtwork } from "@/entities/poster/ui/PosterArtwork";
import { StageHeader } from "@/entities/poster/ui/StageHeader";
import { STAGE_HEADER_GAP } from "@/entities/poster/ui/stage-metrics";

/**
 * 모아 보기(벽). 게시물을 비율 그대로 한 화면에 모은다.
 *
 * 지나가며 몇 초 보는 사람에게 "지금 무엇이 걸려 있는지"를 한눈에 알린다. 글은
 * 이미지 아래 한 줄(카테고리·제목)뿐이고 QR은 없다. QR은 이어서 나오는 크게 보기가
 * 맡는다. 치수는 1920x1080 실측 px이며 `ScaledStage`가 화면에 맞춘다.
 */
interface WallDisplayProps {
  /** 이 쪽에 담을 게시물. 쪽 나누기는 `packWallPages`가 미리 했다. */
  posters: PosterRenderModel[];
  /** 편성 전체의 게시 건수. 벽이 여러 쪽이면 이 쪽의 건수와 다르다. */
  totalCount: number;
  deviceLabel: string | null;
  serverTime: Date | null;
  clockTicking?: boolean;
  onPosterError?: (posterId: string) => void;
  onPosterLoad?: (posterId: string) => void;
}

export function WallDisplay({
  posters,
  totalCount,
  deviceLabel,
  serverTime,
  clockTicking,
  onPosterError,
  onPosterLoad,
}: WallDisplayProps) {
  const rows = layoutWallPage(posters);

  return (
    <div className="flex h-full flex-col" style={{ gap: STAGE_HEADER_GAP }}>
      <StageHeader
        deviceLabel={deviceLabel}
        serverTime={serverTime}
        clockTicking={clockTicking}
      >
        <span className="text-[26px] text-ink-muted">
          게시 중 {totalCount}건
        </span>
      </StageHeader>

      <div
        className="flex min-h-0 flex-1 flex-col justify-center"
        style={{ gap: WALL_METRICS.rowGap }}
      >
        {rows.map((row, rowIndex) => (
          <div
            key={rowIndex}
            className="flex justify-center"
            style={{ gap: WALL_METRICS.gap }}
          >
            {row.tiles.map(({ poster, width }) => (
              <figure key={poster.id} className="m-0" style={{ width }}>
                <div
                  className="overflow-hidden rounded-tv-poster shadow-poster"
                  style={{ height: row.height }}
                >
                  <PosterArtwork
                    poster={poster}
                    fit={hasKnownSize(poster) ? "cover" : "contain"}
                    onLoadError={onPosterError}
                    onLoad={onPosterLoad}
                  />
                </div>
                <figcaption className="mt-3 truncate text-[22px] leading-8 text-ink-muted">
                  <span className="mr-2.5 text-ink-subtle">
                    {poster.categoryName}
                  </span>
                  {poster.title}
                </figcaption>
              </figure>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
