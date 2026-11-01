import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";
import lumiere from "./samples/lumiere-2026.webp";
import magicShop from "./samples/magic-shop.webp";
import wingSurvival from "./samples/wing-survival.webp";

/**
 * 소개 화면 "이런 걸 올릴 수 있어요" 카드 아래의 그림.
 *
 * 세 그림이 같은 구도를 쓴다: 종류 색 바탕에서 물건이 카드 아래 가장자리 밖으로
 * 살짝 잘려 나가며 올라온다. TV 화면을 통째로 그리지 않고 컨텐츠 한두 개만 크게
 * 보여 줘서 무엇을 올리는지만 읽히게 한다. 꾸밈 그림이라 보조기기에는 숨긴다
 * (같은 내용은 카드 설명에 있다).
 */
function ArtArea({ tint, children }: { tint: string; children: ReactNode }) {
  return (
    <div className={cn("relative h-44 overflow-hidden", tint)}>{children}</div>
  );
}

/** 포스터: 실제 포스터 세 장을 부채꼴로 */
export function PosterArt() {
  return (
    <ArtArea tint="bg-type-poster-subtle">
      <div className="absolute inset-x-0 -bottom-4 flex items-end justify-center">
        <Poster
          src={wingSurvival}
          className="relative z-0 -mr-4 w-[5.5rem] origin-bottom-right -rotate-[9deg]"
        />
        <Poster src={magicShop} className="relative z-10 w-[6.5rem] -translate-y-2" />
        <Poster
          src={lumiere}
          className="relative z-0 -ml-4 w-[5.5rem] origin-bottom-left rotate-[9deg]"
        />
      </div>
    </ArtArea>
  );
}

function Poster({ src, className }: { src: string; className?: string }) {
  return (
    <img
      src={src}
      alt=""
      draggable={false}
      className={cn(
        "aspect-3/4 rounded-lg object-cover shadow-[0_10px_24px_rgb(29_78_216/0.28)] ring-1 ring-white/60",
        className,
      )}
    />
  );
}

/** 이벤트 배너: 종류가 다른 배너 두 장이 겹친 모습 */
export function EventArt() {
  return (
    <ArtArea tint="bg-type-event-subtle">
      <Banner
        tag="생일 축하"
        headline="지민아, 생일 축하해"
        className="absolute top-3 left-1/2 w-[76%] -translate-x-[56%] -rotate-[4deg] opacity-70"
      />
      <Banner
        tag="합격 축하"
        headline="수현아, 합격 축하해"
        sender="연구실 동기들이"
        className="absolute top-[5.5rem] left-1/2 w-[76%] -translate-x-[44%] rotate-[2deg] shadow-[0_12px_28px_rgb(174_24_0/0.25)]"
      />
    </ArtArea>
  );
}

function Banner({
  tag,
  headline,
  sender,
  className,
}: {
  tag: string;
  headline: string;
  sender?: string;
  className?: string;
}) {
  return (
    <div className={cn("rounded-tile bg-hero-raised px-4 py-3.5 text-hero-ink", className)}>
      <span className="inline-flex rounded-pill bg-accent px-2 py-0.5 text-overline text-accent-on">
        {tag}
      </span>
      <p className="mt-1.5 text-subhead">{headline}</p>
      {sender && <p className="text-caption text-hero-muted">{sender}</p>}
    </div>
  );
}

/** 소식 제보: 말머리와 번호가 붙은 카드 두 장을 엇갈리게 */
export function StoryArt() {
  return (
    <ArtArea tint="bg-type-story-subtle">
      <StoryCard
        tag="칭찬"
        number={128}
        className="absolute top-7 left-5 w-[54%] -rotate-[3deg]"
      >
        세탁실 건조기 2번이 고쳐졌어요!
      </StoryCard>
      <StoryCard
        tag="분실물"
        number={127}
        className="absolute top-[4.75rem] right-5 w-[54%] rotate-[3deg]"
      >
        A동 로비에서 파란 텀블러를 주웠어요
      </StoryCard>
    </ArtArea>
  );
}

function StoryCard({
  tag,
  number,
  className,
  children,
}: {
  tag: string;
  number: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-tile bg-hero-raised px-3.5 py-3 text-hero-ink shadow-[0_12px_24px_rgb(180_83_9/0.22)]",
        className,
      )}
    >
      <div className="flex items-center gap-1.5 text-overline">
        <span className="rounded-pill bg-type-story-bar px-2 py-0.5 text-stage">
          {tag}
        </span>
        <span className="font-normal text-zinc-400">#{number}</span>
      </div>
      <p className="mt-1.5 line-clamp-2 text-label font-bold">{children}</p>
    </div>
  );
}
