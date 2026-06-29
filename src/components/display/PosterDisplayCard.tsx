import type { NoticeContent } from "../../types/content";
import { PosterArtwork } from "../common/PosterArtwork";
import { QRCodeBox } from "../common/QRCodeBox";

interface PosterDisplayCardProps {
  content: NoticeContent;
  compact?: boolean;
}

export function PosterDisplayCard({
  content,
  compact = false,
}: PosterDisplayCardProps) {
  return (
    <article className="flex h-full items-center justify-center">
      <div className="relative aspect-[3/4] h-full max-h-full overflow-hidden rounded-2xl shadow-2xl shadow-violet-400/30 ring-1 ring-white/60">
        <PosterArtwork content={content} fit="cover" />
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-gray-950/85 via-gray-950/40 to-transparent p-3 pt-10 text-white">
          <div className="min-w-0">
            <span
              className={`inline-block rounded-full bg-violet-500/40 px-2 py-0.5 font-black text-violet-50 backdrop-blur ${
                compact ? "text-[10px]" : "text-xs"
              }`}
            >
              {content.category}
            </span>
            <h3
              className={`mt-1.5 line-clamp-1 break-keep font-black ${
                compact ? "text-sm" : "text-xl"
              }`}
            >
              {content.title}
            </h3>
            <p
              className={`mt-0.5 truncate font-semibold text-white/70 ${
                compact ? "text-[10px]" : "text-sm"
              }`}
            >
              {content.startDate.replaceAll("-", ".")} ~{" "}
              {content.endDate?.replaceAll("-", ".")}
            </p>
          </div>
          <QRCodeBox value={content.qrCodeUrl} size={compact ? "sm" : "md"} />
        </div>
      </div>
    </article>
  );
}
