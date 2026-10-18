import { useState } from "react";
import type { PosterRenderModel } from "@/entities/poster";
import { hasKnownSize } from "@/entities/poster/model/types";
import {
  INFO_TOP,
  mod,
  OPACITY_BY_DISTANCE,
  placeStrip,
  SLIDE_DURATION_MS,
  SLIDE_EASING,
} from "@/entities/poster/model/strip-layout";
import type { PlacedItem } from "@/entities/poster/model/strip-layout";
import { PosterArtwork } from "@/entities/poster/ui/PosterArtwork";
import { StageHeader } from "@/entities/poster/ui/StageHeader";
import {
  TV_STAGE_PADDING,
  TV_STAGE_WIDTH,
} from "@/entities/poster/ui/stage-metrics";
import { QRCodeBox } from "@/shared/components/QRCodeBox";
import { cn } from "@/shared/lib/utils";

/**
 * 흐르는 띠. 게시물을 같은 높이로 한 줄에 이어 붙이고 한 칸씩 민다.
 *
 * 가운데 한 건만 선명하고 아래에 제목·QR이 나온다. 양옆은 이전·다음을 흐리게
 * 미리 보여 줘서 화면이 늘 차 있고, 다음에 무엇이 나올지 보인다.
 *
 * 가운데 한 건이 돋보이게 양옆은 작고 흐리게 두고, 멀수록 더 흐려 바탕으로
 * 녹아들게 한다. 배경 흐림과 아래 제목 줄은 칸마다 두고 투명도로 바꿔, 넘어갈 때
 * 이전 것과 새 것이 겹치며 바뀐다(갑자기 사라졌다 나타나지 않는다).
 *
 * 움직임은 transform과 opacity만 쓴다. 크기나 위치(left·width)를 바꾸면 TV용
 * 저사양 기기에서 매 프레임 배치를 다시 계산해 끊긴다. 양옆이 작아 보이는 것도
 * scale이다. 줄은 화면 가장자리(여백 밖)까지 이어진다.
 *
 * 칸마다 key는 게시물 id가 아니라 띠 위의 절대 위치다. 한 바퀴 돌아 같은 게시물이
 * 다시 들어올 때 화면을 가로질러 되돌아가지 않고 오른쪽 끝에서 새로 들어온다.
 */
interface StripDisplayProps {
  posters: PosterRenderModel[];
  /** 가운데에 올 게시물의 순서 */
  focusIndex: number;
  deviceLabel: string | null;
  serverTime: Date | null;
  clockTicking?: boolean;
  onPosterError?: (posterId: string) => void;
  onPosterLoad?: (posterId: string) => void;
}

/**
 * 가운데 순서가 바뀌면 띠 위의 절대 위치를 그만큼 옮긴다. 앞으로 가는 쪽이 짧으면
 * 앞으로, 뒤로 가는 쪽이 짧으면 뒤로 간다(미리보기에서 되돌릴 때).
 */
function useFocusSlot(focusIndex: number, count: number): number {
  const [cursor, setCursor] = useState({ index: focusIndex, slot: focusIndex });
  if (cursor.index !== focusIndex && count > 0) {
    const forward = mod(focusIndex - cursor.index, count);
    const delta = forward <= count / 2 ? forward : forward - count;
    setCursor({ index: focusIndex, slot: cursor.slot + delta });
  }
  return cursor.slot;
}

const slide = {
  transitionDuration: `${SLIDE_DURATION_MS}ms`,
  transitionTimingFunction: SLIDE_EASING,
};

export function StripDisplay({
  posters,
  focusIndex,
  deviceLabel,
  serverTime,
  clockTicking,
  onPosterError,
  onPosterLoad,
}: StripDisplayProps) {
  const focusSlot = useFocusSlot(focusIndex, posters.length);
  // 띠 위의 위치 순서(왼쪽 → 오른쪽)로 그린다. 한 칸 밀어도 순서가 그대로라
  // React가 DOM을 옮기지 않는다. 옮겨진 요소는 브라우저가 새로 생긴 것으로 보고
  // 전환을 건너뛰어서, 그 칸만 순간이동한다(가운데 칸이 왼쪽으로 튀던 원인).
  const items = placeStrip(posters, focusSlot).sort((a, b) => a.slot - b.slot);
  // 배경과 제목 줄은 가운데와 바로 옆만 둔다. 넘어갈 때 겹쳐 바뀌는 데 필요한 만큼이다.
  const near = items.filter((item) => Math.abs(item.offset) <= 1);

  return (
    <div className="relative isolate h-full">
      <div
        aria-hidden="true"
        className="absolute -z-10 overflow-hidden"
        style={{ inset: -TV_STAGE_PADDING }}
      >
        {near.map(
          (item) =>
            item.poster.posterUrl && (
              <img
                key={item.slot}
                src={item.poster.posterUrl}
                alt=""
                className="absolute top-0 left-0 h-1/4 w-1/4 origin-top-left scale-[4.4] object-cover blur-[28px] saturate-[1.2] transition-opacity"
                style={{ ...slide, opacity: item.offset === 0 ? 0.22 : 0 }}
              />
            ),
        )}
      </div>

      <StageHeader
        deviceLabel={deviceLabel}
        serverTime={serverTime}
        clockTicking={clockTicking}
      >
        <span className="text-[24px] text-ink-subtle tabular-nums">
          {mod(focusIndex, Math.max(posters.length, 1)) + 1} / {posters.length}
        </span>
      </StageHeader>

      <div
        className="absolute top-0"
        style={{
          left: -TV_STAGE_PADDING,
          width: TV_STAGE_WIDTH,
          height: "100%",
        }}
      >
        {items.map((item) => {
          const isFocus = item.offset === 0;
          return (
            <div
              key={item.slot}
              className={cn(
                "absolute top-0 left-0 overflow-hidden rounded-tv-card bg-canvas transition-[transform,opacity,box-shadow]",
                isFocus ? "z-10 shadow-poster-lg" : "shadow-none",
              )}
              style={{
                ...slide,
                width: item.width,
                height: item.height,
                opacity:
                  OPACITY_BY_DISTANCE[
                    Math.min(
                      Math.abs(item.offset),
                      OPACITY_BY_DISTANCE.length - 1,
                    )
                  ],
                transform: `translate(${item.x}px, ${item.y}px) scale(${item.scale})`,
              }}
            >
              <PosterArtwork
                poster={item.poster}
                fit={hasKnownSize(item.poster) ? "cover" : "contain"}
                onLoadError={onPosterError}
                onLoad={onPosterLoad}
              />
            </div>
          );
        })}
      </div>

      {near.map((item) => (
        <StripCaption key={item.slot} item={item} />
      ))}
    </div>
  );
}

/**
 * 가운데 칸의 제목·QR. 나갈 때는 빨리 흐려지고, 들어올 때는 칸이 거의 자리 잡은
 * 뒤에 살짝 떠오르며 나타난다. 두 줄이 겹쳐 읽히는 순간을 줄이려는 것이다.
 */
function StripCaption({ item }: { item: PlacedItem }) {
  const visible = item.offset === 0;
  const { poster } = item;
  return (
    <div
      aria-hidden={!visible}
      className="absolute right-0 left-0 flex items-center gap-12 transition-[opacity,transform] ease-out"
      style={{
        top: INFO_TOP,
        bottom: 0,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(12px)",
        transitionDuration: visible ? "600ms" : "250ms",
        transitionDelay: visible ? `${SLIDE_DURATION_MS * 0.45}ms` : "0ms",
      }}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-5">
          <span className="shrink-0 rounded-pill bg-accent px-5 py-1 text-[24px] font-bold text-accent-on">
            {poster.categoryName}
          </span>
          <span className="truncate text-[28px] text-ink-muted">
            {[poster.location, poster.organizerName]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </div>
        {/* 보이는 줄만 heading으로 둔다. 겹쳐 둔 이웃 줄이 읽히지 않게 한다. */}
        {visible ? (
          <h1 className="mt-3 truncate text-[60px] leading-[1.1] font-extrabold tracking-tight text-ink">
            {poster.title}
          </h1>
        ) : (
          <p className="mt-3 truncate text-[60px] leading-[1.1] font-extrabold tracking-tight text-ink">
            {poster.title}
          </p>
        )}
      </div>
      {poster.detailUrl && (
        <div className="flex shrink-0 items-center gap-6">
          <p className="text-right text-[28px] leading-snug font-extrabold text-ink">
            Ziggle에서
            <br />
            자세히 보기
          </p>
          <QRCodeBox value={poster.detailUrl} size="lg" />
        </div>
      )}
    </div>
  );
}
