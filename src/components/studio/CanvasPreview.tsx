import type { NoticeContent } from "../../types/content";
import { PosterArtwork } from "../common/PosterArtwork";

interface CanvasPreviewProps {
  content: NoticeContent;
  customPreviewUrl?: string | null;
}

export function CanvasPreview({
  content,
  customPreviewUrl,
}: CanvasPreviewProps) {
  return (
    <main className="flex min-w-0 flex-1 flex-col bg-gray-50">
      <div className="border-b border-gray-100 bg-white/60 px-4 py-3 backdrop-blur">
        <p className="text-center text-xs font-bold text-gray-500">
          TV 표시 미리보기 · 세로형 포스터 (3:4)
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center overflow-hidden p-6">
        <div className="aspect-[3/4] h-full max-h-full overflow-hidden rounded-2xl bg-white shadow-2xl shadow-violet-200/50 ring-1 ring-gray-100">
          {customPreviewUrl ? (
            <img
              src={customPreviewUrl}
              alt="업로드 포스터 미리보기"
              className="h-full w-full object-contain"
            />
          ) : (
            <PosterArtwork content={content} fit="cover" />
          )}
        </div>
      </div>
    </main>
  );
}
