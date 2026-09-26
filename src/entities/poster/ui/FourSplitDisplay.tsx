import { FOUR_GRID_SLOT_COUNT } from "@/entities/playlist/model/types";
import type { PosterRenderModel } from "@/entities/poster";
import { ZIGGLE_HOST } from "@/shared/lib/ziggle-url";
import { Logo } from "@/shared/components/Logo";
import { PosterArtwork } from "@/entities/poster/ui/PosterArtwork";
import { QRCodeBox } from "@/shared/components/QRCodeBox";

/**
 * TV 4분할 레이아웃 (명세 FR-PLY-02).
 *
 * 세로 3:4 포스터를 2x2로 놓으면 16:9 화면의 절반이 빈다. 한 줄로 네 칸을 놓는다.
 *
 * 칸 수는 항상 넷이다. 마지막 페이지처럼 포스터가 모자라면 빈 칸은 게시 안내
 * 카드로 채운다. 칸 수를 포스터 수에 맞추면 한두 장일 때 포스터가 화면보다 커져
 * 제목과 QR이 잘린다.
 */
interface FourSplitDisplayProps {
  posters: PosterRenderModel[];
  onPosterError?: (posterId: string) => void;
  onPosterLoad?: (posterId: string) => void;
}

export function FourSplitDisplay({
  posters,
  onPosterError,
  onPosterLoad,
}: FourSplitDisplayProps) {
  const visible = posters.slice(0, FOUR_GRID_SLOT_COUNT);
  if (visible.length === 0) return null;
  const emptySlots = FOUR_GRID_SLOT_COUNT - visible.length;

  return (
    <div className="grid h-full min-h-0 grid-cols-4 grid-rows-[minmax(0,1fr)] gap-8">
      {visible.map((poster) => (
        <article
          key={poster.id}
          className="flex min-w-0 flex-col gap-5 overflow-hidden rounded-tv-card bg-white/[0.05] p-6 ring-1 ring-white/10"
        >
          <div className="aspect-3/4 w-full shrink-0 overflow-hidden rounded-tv-poster shadow-poster">
            <PosterArtwork
              poster={poster}
              fit="cover"
              onLoadError={onPosterError}
              onLoad={onPosterLoad}
            />
          </div>

          <div className="min-h-0 flex-1 overflow-hidden">
            <span className="inline-flex rounded-pill bg-accent px-3.5 py-1 text-[22px] font-bold text-accent-on">
              {poster.categoryName}
            </span>
            <h2 className="mt-3 line-clamp-2 text-[36px] leading-[1.15] font-extrabold tracking-tight text-ink">
              {poster.title}
            </h2>
            {poster.organizationName && (
              <p className="mt-2 truncate text-[25px] text-ink-muted">
                {poster.organizationName}
              </p>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-4">
            <QRCodeBox value={poster.detailUrl} size="lg" />
            <p className="text-[23px] leading-snug font-semibold text-ink-muted">
              Ziggle에서
              <br />
              자세히 보기
            </p>
          </div>
        </article>
      ))}

      {Array.from({ length: emptySlots }, (_, index) => (
        <EmptySlot key={`empty-${index}`} />
      ))}
    </div>
  );
}

/** 포스터가 모자란 칸. 비워 두면 고장처럼 보여서 게시 방법을 알린다. */
function EmptySlot() {
  return (
    <div
      className="flex min-w-0 flex-col items-center justify-center gap-6 rounded-tv-card p-8 text-center ring-1 ring-white/10"
      aria-hidden="true"
    >
      <Logo size="lg" />
      <p className="text-[26px] leading-snug text-ink-muted">
        Ziggle 공지를 쓰면
        <br />
        여기에 함께 걸 수 있어요
      </p>
      <p className="text-[22px] text-ink-subtle">{ZIGGLE_HOST}</p>
    </div>
  );
}
