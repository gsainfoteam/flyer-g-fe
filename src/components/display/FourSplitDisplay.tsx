import { FOUR_GRID_SLOT_COUNT } from "@/entities/playlist/model/types";
import type { PosterRenderModel } from "@/entities/poster";
import { PosterDisplayCard } from "./PosterDisplayCard";

/**
 * 4분할 레이아웃.
 *
 * 세로 3:4 포스터를 2x2로 놓으면 16:9 화면의 절반이 빈다. 한 줄로 늘어놓고 칸 수를
 * 실제 항목 수에 맞추면 같은 높이에서 화면을 채우고 각 포스터도 커진다.
 *
 * 페이지 단위 순환과 1920x1080 실측 검증, 빈 슬롯의 브랜드 fallback은 Phase 05 범위다.
 * (명세 FR-PLY-02, FR-PLY-03)
 */
interface FourSplitDisplayProps {
  posters: PosterRenderModel[];
}

export function FourSplitDisplay({ posters }: FourSplitDisplayProps) {
  const visible = posters.slice(0, FOUR_GRID_SLOT_COUNT);
  if (visible.length === 0) return null;

  return (
    <section
      className="grid h-full min-h-0 gap-6"
      style={{
        gridTemplateColumns: `repeat(${visible.length}, minmax(0, 1fr))`,
        // 행이 auto면 자식의 h-full이 0으로 풀린다. 한 행이 높이를 모두 차지하게 한다.
        gridTemplateRows: "minmax(0, 1fr)",
      }}
    >
      {visible.map((poster) => (
        <PosterDisplayCard key={poster.id} poster={poster} compact />
      ))}
    </section>
  );
}
