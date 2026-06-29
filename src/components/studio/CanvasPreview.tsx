import {
  ChevronLeft,
  ChevronRight,
  Minus,
  Monitor,
  Plus,
  Redo2,
  Undo2,
} from "lucide-react";
import type { NoticeContent } from "../../types/content";
import { PosterArtwork } from "../common/PosterArtwork";

interface CanvasPreviewProps {
  content: NoticeContent;
  selectedPage: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
}

export function CanvasPreview({
  content,
  selectedPage,
  totalPages,
  onPrev,
  onNext,
}: CanvasPreviewProps) {
  return (
    <main className="flex min-w-0 flex-1 flex-col bg-gray-50">
      <div className="flex items-center justify-center gap-2 border-b border-gray-100 bg-white/60 px-4 py-2.5 backdrop-blur">
        <div className="flex items-center gap-1 rounded-lg bg-white px-1 py-1 shadow-sm ring-1 ring-gray-100">
          <button className="grid size-8 place-items-center rounded-md text-gray-500 hover:bg-gray-50">
            <Undo2 className="size-4" />
          </button>
          <button className="grid size-8 place-items-center rounded-md text-gray-500 hover:bg-gray-50">
            <Redo2 className="size-4" />
          </button>
        </div>
        <div className="flex items-center gap-1 rounded-lg bg-white px-1 py-1 shadow-sm ring-1 ring-gray-100">
          <button className="grid size-8 place-items-center rounded-md text-gray-500 hover:bg-gray-50">
            <Minus className="size-4" />
          </button>
          <span className="px-1 text-xs font-black text-gray-700">100%</span>
          <button className="grid size-8 place-items-center rounded-md text-gray-500 hover:bg-gray-50">
            <Plus className="size-4" />
          </button>
        </div>
        <button className="grid size-9 place-items-center rounded-lg bg-white text-gray-500 shadow-sm ring-1 ring-gray-100 hover:bg-gray-50">
          <Monitor className="size-4" />
        </button>
      </div>

      <div className="flex flex-1 items-center justify-center overflow-hidden p-6">
        <div className="aspect-[3/4] h-full max-h-full overflow-hidden rounded-2xl bg-white shadow-2xl shadow-violet-200/50 ring-1 ring-gray-100">
          <PosterArtwork content={content} fit="cover" />
        </div>
      </div>

      <div className="flex items-center justify-center gap-3 border-t border-gray-100 bg-white/60 px-4 py-3 backdrop-blur">
        <button
          onClick={onPrev}
          className="grid size-8 place-items-center rounded-lg bg-white text-gray-500 shadow-sm ring-1 ring-gray-100 hover:bg-gray-50"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="text-sm font-black text-gray-700">
          {selectedPage} / {totalPages}
        </span>
        <button
          onClick={onNext}
          className="grid size-8 place-items-center rounded-lg bg-white text-gray-500 shadow-sm ring-1 ring-gray-100 hover:bg-gray-50"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </main>
  );
}
