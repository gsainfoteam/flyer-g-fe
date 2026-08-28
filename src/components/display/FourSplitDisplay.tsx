import { FOUR_GRID_SLOT_COUNT } from "@/entities/playlist/model/types";
import type { PosterRenderModel } from "@/entities/poster";
import { formatSeoulShortDate } from "@/shared/lib/datetime";
import { PosterArtwork } from "../common/PosterArtwork";
import { QRCodeBox } from "../common/QRCodeBox";

/**
 * TV 4분할 레이아웃.
 *
 * 세로 3:4 포스터를 2x2로 놓으면 16:9 화면의 절반이 빈다. 한 줄로 늘어놓고 칸 수를
 * 실제 항목 수에 맞추면 같은 높이에서 화면을 채우고 각 포스터도 커진다.
 *
 * 페이지 단위 순환과 1920x1080 실측 검증, 빈 슬롯의 브랜드 fallback은 Phase 05 범위다.
 * (명세 FR-PLY-02, FR-PLY-03)
 */
interface FourSplitDisplayProps {
  posters: PosterRenderModel[];
  onPosterError?: (posterId: string) => void;
}

export function FourSplitDisplay({
  posters,
  onPosterError,
}: FourSplitDisplayProps) {
  const visible = posters.slice(0, FOUR_GRID_SLOT_COUNT);
  if (visible.length === 0) return null;

  return (
    <div
      className="grid h-full min-h-0 gap-8"
      style={{
        gridTemplateColumns: `repeat(${visible.length}, minmax(0, 1fr))`,
        gridTemplateRows: "minmax(0, 1fr)",
      }}
    >
      {visible.map((poster) => (
        <article
          key={poster.id}
          className="flex min-w-0 flex-col gap-5 overflow-hidden"
        >
          <div className="aspect-3/4 w-full shrink-0 overflow-hidden rounded-[20px]">
            <PosterArtwork poster={poster} fit="cover" onLoadError={onPosterError} />
          </div>

          <div className="min-h-0">
            <span className="inline-flex rounded-pill bg-accent px-3.5 py-1 text-[22px] font-bold text-accent-on">
              {poster.categoryName}
            </span>
            <h2 className="mt-3 line-clamp-2 text-[36px] leading-[1.15] font-extrabold tracking-tight text-ink">
              {poster.title}
            </h2>
            <p className="mt-2 truncate text-[25px] text-ink-muted">
              ~ {formatSeoulShortDate(poster.endAt)} · {poster.organizationName}
            </p>
          </div>

          <div className="mt-auto flex items-center gap-4">
            <QRCodeBox value={poster.detailUrl} size="lg" />
            <p className="text-[23px] leading-snug font-semibold text-ink-muted">
              Ziggle에서
              <br />
              자세히 보기
            </p>
          </div>
        </article>
      ))}
    </div>
  );
}
