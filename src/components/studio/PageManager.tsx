import { GripVertical, MoreVertical, Plus } from "lucide-react";
import type { NoticeContent } from "../../types/content";
import { PosterArtwork } from "../common/PosterArtwork";

interface PageManagerProps {
  pages: number[];
  selectedPage: number;
  onSelectPage: (page: number) => void;
  onAddPage: () => void;
  posters: NoticeContent[];
}

export function PageManager({
  pages,
  selectedPage,
  onSelectPage,
  onAddPage,
  posters,
}: PageManagerProps) {
  return (
    <div className="mt-6">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-black text-gray-900">페이지 관리</h3>
        <button
          onClick={onAddPage}
          className="inline-flex items-center gap-1 text-xs font-bold text-violet-600 hover:text-violet-700"
        >
          <Plus className="size-3.5" />
          페이지 추가
        </button>
      </div>
      <div className="space-y-2">
        {pages.map((page, index) => {
          const poster = posters[index % posters.length];
          const active = selectedPage === page;
          return (
            <button
              key={page}
              onClick={() => onSelectPage(page)}
              className={`flex w-full items-center gap-2 rounded-xl border p-2 text-left transition ${
                active
                  ? "border-violet-200 bg-violet-50"
                  : "border-gray-100 bg-white hover:bg-gray-50"
              }`}
            >
              <GripVertical className="size-4 shrink-0 text-gray-300" />
              <div className="aspect-[3/4] w-8 shrink-0 overflow-hidden rounded-md bg-gray-100">
                {poster && <PosterArtwork content={poster} fit="cover" />}
              </div>
              <span
                className={`flex-1 text-xs font-bold ${
                  active ? "text-violet-700" : "text-gray-700"
                }`}
              >
                {page} 페이지
              </span>
              <MoreVertical className="size-4 shrink-0 text-gray-300" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
