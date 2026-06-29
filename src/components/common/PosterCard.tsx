import { Eye, Heart, MoreVertical } from "lucide-react";
import type { NoticeContent } from "../../types/content";
import { PosterArtwork } from "./PosterArtwork";
import { StatusBadge } from "./StatusBadge";

interface PosterCardProps {
  content: NoticeContent;
}

export function PosterCard({ content }: PosterCardProps) {
  return (
    <article className="group overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm shadow-violet-100/40 transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-gray-50">
        <PosterArtwork content={content} fit="cover" />
        <div className="absolute left-2.5 top-2.5">
          <StatusBadge status={content.status} />
        </div>
      </div>
      <div className="space-y-2 p-3">
        <h3 className="line-clamp-1 break-keep text-sm font-black text-gray-900">
          {content.title}
        </h3>
        <p className="text-[11px] font-semibold text-gray-400">
          {content.startDate.replaceAll("-", ".")} ~{" "}
          {content.endDate?.replaceAll("-", ".")}
        </p>
        <div className="flex items-center justify-between border-t border-gray-50 pt-2">
          <div className="flex items-center gap-3 text-[11px] font-bold text-gray-400">
            <span className="flex items-center gap-1">
              <Eye className="size-3.5" />
              {content.views.toLocaleString()}
            </span>
            <span className="flex items-center gap-1">
              <Heart className="size-3.5" />
              {content.likes ?? 0}
            </span>
          </div>
          <button className="grid size-6 place-items-center rounded-lg text-gray-300 hover:bg-gray-50 hover:text-gray-500">
            <MoreVertical className="size-4" />
          </button>
        </div>
      </div>
    </article>
  );
}
