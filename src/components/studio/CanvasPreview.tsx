import type { PosterRenderModel } from "@/entities/poster";
import { PosterArtwork } from "../common/PosterArtwork";

/**
 * TV 표시 미리보기.
 *
 * 지금은 포스터 이미지만 보여준다. SINGLE/FOUR_GRID 전환과 폼 입력의 즉시 반영,
 * 실제 QR은 Phase 02에서 플레이어와 같은 렌더러로 통합한다. (명세 FR-SUB-03)
 */
interface CanvasPreviewProps {
  poster: PosterRenderModel;
  customPreviewUrl?: string | null;
}

export function CanvasPreview({ poster, customPreviewUrl }: CanvasPreviewProps) {
  return (
    <main className="flex min-w-0 flex-1 flex-col bg-canvas">
      <div className="border-b border-line bg-surface/60 px-4 py-3 backdrop-blur">
        <p className="text-center text-caption text-ink-muted">
          TV 표시 미리보기 · 세로형 포스터 (3:4)
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center overflow-hidden p-6">
        <div className="aspect-[3/4] h-full max-h-full overflow-hidden rounded-card bg-surface shadow-floating ring-1 ring-line">
          {customPreviewUrl ? (
            <img
              src={customPreviewUrl}
              alt="업로드한 포스터 미리보기"
              className="h-full w-full object-contain"
            />
          ) : (
            <PosterArtwork poster={poster} fit="cover" />
          )}
        </div>
      </div>
    </main>
  );
}
