import type { PosterRenderModel } from "@/entities/poster";
import { formatSeoulPeriod } from "@/shared/lib/datetime";
import { cn } from "@/shared/lib/utils";
import { PosterArtwork } from "../common/PosterArtwork";
import { QRCodeBox } from "../common/QRCodeBox";

interface PosterDisplayCardProps {
  poster: PosterRenderModel;
  compact?: boolean;
}

export function PosterDisplayCard({
  poster,
  compact = false,
}: PosterDisplayCardProps) {
  return (
    <article className="flex h-full min-w-0 items-center justify-center">
      <div className="relative aspect-[3/4] h-full max-h-full w-auto max-w-full overflow-hidden rounded-card shadow-floating ring-1 ring-line">
        <PosterArtwork poster={poster} fit="cover" hideFallbackText />
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-ink/80 via-ink/35 to-transparent p-3 pt-12 text-white">
          <div className="min-w-0">
            <span
              className={cn(
                "inline-block rounded-pill bg-white/20 px-2 py-0.5 font-medium text-white backdrop-blur",
                compact ? "text-caption" : "text-label",
              )}
            >
              {poster.categoryName}
            </span>
            <h3
              className={cn(
                "mt-1.5 line-clamp-1 break-keep font-semibold",
                compact ? "text-body" : "text-title",
              )}
            >
              {poster.title}
            </h3>
            <p
              className={cn(
                "mt-0.5 truncate text-white/80",
                compact ? "text-caption" : "text-body",
              )}
            >
              {formatSeoulPeriod(poster.startAt, poster.endAt)}
            </p>
          </div>
          <QRCodeBox value={poster.detailUrl} size={compact ? "sm" : "md"} />
        </div>
      </div>
    </article>
  );
}
