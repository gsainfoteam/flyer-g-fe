import { FOUR_GRID_SLOT_COUNT } from "@/entities/playlist/model/types";
import type { PosterRenderModel } from "@/entities/poster";
import { PosterDisplayCard } from "./PosterDisplayCard";

/**
 * 4분할 레이아웃.
 *
 * 페이지 단위 순환과 1920x1080 최적화, 빈 슬롯의 브랜드 fallback은 Phase 05 범위다.
 * (명세 FR-PLY-02, FR-PLY-03)
 */
interface FourSplitDisplayProps {
  posters: PosterRenderModel[];
}

export function FourSplitDisplay({ posters }: FourSplitDisplayProps) {
  return (
    <section className="mx-auto grid h-full min-h-0 max-w-[760px] grid-cols-2 grid-rows-2 gap-6">
      {posters.slice(0, FOUR_GRID_SLOT_COUNT).map((poster) => (
        <PosterDisplayCard key={poster.id} poster={poster} />
      ))}
    </section>
  );
}
