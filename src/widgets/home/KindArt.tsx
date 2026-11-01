import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

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

/** 포스터: 그린 포스터 세 장을 부채꼴로 */
export function PosterArt() {
  return (
    <ArtArea tint="bg-type-poster-subtle">
      <div className="absolute inset-x-0 -bottom-4 flex items-end justify-center">
        <PosterShape
          tone="bg-violet-600"
          accent="bg-type-story-bright"
          className="relative z-0 -mr-4 w-[5.5rem] origin-bottom-right -rotate-[9deg]"
        />
        <PosterShape
          tone="bg-type-poster"
          accent="bg-type-poster-bright"
          large
          className="relative z-10 w-[6.5rem] -translate-y-2"
        />
        <PosterShape
          tone="bg-accent"
          accent="bg-white"
          className="relative z-0 -ml-4 w-[5.5rem] origin-bottom-left rotate-[9deg]"
        />
      </div>
    </ArtArea>
  );
}

/**
 * 그린 포스터 한 장. 작은 머리말, 굵은 제목 두 줄, 동그란 그림, 날짜 줄로
 * 포스터라는 것만 읽히게 한다(특정 행사를 흉내 내지 않는다).
 */
function PosterShape({
  tone,
  accent,
  large = false,
  className,
}: {
  tone: string;
  accent: string;
  large?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex aspect-3/4 flex-col overflow-hidden rounded-lg p-2.5 shadow-[0_10px_24px_rgb(29_78_216/0.28)]",
        tone,
        className,
      )}
    >
      <span className="h-1 w-6 rounded-full bg-white/60" />
      <span className={cn("mt-2 h-2.5 rounded-full bg-white", large ? "w-16" : "w-12")} />
      <span className={cn("mt-1 h-2.5 rounded-full bg-white", large ? "w-11" : "w-8")} />
      <span
        className={cn(
          "absolute -right-3 bottom-6 rounded-full opacity-90",
          large ? "size-14" : "size-11",
          accent,
        )}
      />
      <span className="mt-auto h-1 w-10 rounded-full bg-white/70" />
    </div>
  );
}

/**
 * 이벤트 배너: 생일 축하 배너 한 장. 뒤에 다른 배너가 한 장 더 있어 여러 건이
 * 돌아간다는 느낌만 준다(뒤 배너는 거의 가려진다). 실명 대신 별명을 쓴다.
 */
export function EventArt() {
  return (
    <ArtArea tint="bg-type-event-subtle">
      <Banner
        tag="합격 축하"
        headline="모두 합격 축하해"
        className="absolute top-6 left-1/2 w-[72%] -translate-x-[42%] rotate-[5deg] opacity-60"
      />
      <Banner
        tag="생일 축하"
        headline="포포야 생일축하해"
        sender="🌮🌮🌮"
        className="absolute top-11 left-1/2 w-[78%] -translate-x-1/2 -rotate-[2deg] shadow-[0_12px_28px_rgb(174_24_0/0.25)]"
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
      {sender && <p className="mt-0.5 text-body text-hero-muted">{sender}</p>}
    </div>
  );
}

/** 소식 제보: 말머리와 번호가 붙은 카드 두 장을 엇갈리게 */
export function StoryArt() {
  return (
    <ArtArea tint="bg-type-story-subtle">
      <StoryCard
        tag="제보"
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
