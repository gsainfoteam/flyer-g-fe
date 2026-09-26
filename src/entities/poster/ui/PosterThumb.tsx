import type { PosterRenderModel } from "@/entities/poster";
import { cn } from "@/shared/lib/utils";
import { PosterArtwork } from "@/entities/poster/ui/PosterArtwork";

/**
 * 목록에서 쓰는 세로 3:4 썸네일. 크기를 한곳에서 관리해 목록마다 달라지지 않게 한다.
 */
const sizeClass = {
  sm: "w-10",
  md: "w-12",
  lg: "w-[150px]",
} as const;

interface PosterThumbProps {
  poster: PosterRenderModel;
  size?: keyof typeof sizeClass;
  className?: string;
}

export function PosterThumb({
  poster,
  size = "md",
  className,
}: PosterThumbProps) {
  return (
    <div
      className={cn(
        "aspect-3/4 shrink-0 overflow-hidden rounded-thumb bg-surface-muted",
        sizeClass[size],
        className,
      )}
    >
      <PosterArtwork poster={poster} fit="cover" />
    </div>
  );
}
