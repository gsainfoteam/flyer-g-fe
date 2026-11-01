import type { ReactNode } from "react";
import { LogoMark } from "@/shared/components";
import { cn } from "@/shared/lib/utils";
import magicShop from "./samples/magic-shop.webp";

/**
 * 소개 화면 "이런 걸 올릴 수 있어요" 카드의 그림. 종류마다 TV에 실제로 나오는
 * 모습을 작은 TV로 보여 준다(예시 데이터). (기획 3-1)
 *
 * 위의 예시 TV와 같은 틀(머리 줄·카드·하단 정보줄)을 줄여 쓴다. 글자 크기는 컨테이너
 * 폭 기준(cqw)이라 카드 폭이 달라도 비율이 그대로다.
 */
function MiniTv({
  position,
  children,
}: {
  /** 머리 줄 오른쪽의 장면 위치 */
  position: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[0.75rem] bg-zinc-800 p-1.5 shadow-[0_12px_28px_rgb(0_0_0/0.22)]">
      <div className="@container">
        <div className="flex aspect-video flex-col overflow-hidden rounded-[0.4rem] bg-stage text-hero-ink">
          <div className="flex min-h-0 flex-1 flex-col gap-[2.4cqw] px-[5cqw] pt-[3.6cqw] pb-[2.6cqw]">
            <div className="flex items-center gap-[1.4cqw] text-[2.6cqw] font-extrabold">
              <LogoMark className="size-[4cqw]" />
              전단지
              <span className="font-normal text-zinc-400">A동 로비</span>
              <span className="ml-auto font-normal text-zinc-400">{position}</span>
            </div>
            <div className="min-h-0 flex-1">{children}</div>
          </div>
          <div className="flex h-[7.5cqw] flex-none items-center gap-[3cqw] bg-hero px-[4cqw] text-[2.4cqw] text-zinc-300">
            <b className="text-[3cqw] text-hero-ink">12:10</b>
            <span>맑음 14°</span>
            <span>종강 D-50</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** 카드 아래 칸. 종류 색 바탕 위에 작은 TV와 한 줄 설명 */
function PreviewArea({
  tint,
  children,
}: {
  tint: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-2.5 px-5 pt-5 pb-6", tint)}>
      <p className="text-caption font-semibold text-ink-muted">
        TV에서는 이렇게 나와요
      </p>
      {children}
    </div>
  );
}

export function PosterPreview() {
  return (
    <PreviewArea tint="bg-type-poster-subtle">
      <MiniTv position="포스터 3 / 12">
        <div className="flex h-full items-center gap-[5cqw]">
          <img
            src={magicShop}
            alt=""
            draggable={false}
            className="h-full w-auto flex-none rounded-[1.2cqw] object-cover"
            style={{ aspectRatio: 1280 / 1707 }}
          />
          <div className="min-w-0">
            <span className="inline-flex rounded-pill bg-type-poster-bar px-[2cqw] py-[0.6cqw] text-[2.4cqw] font-bold text-white">
              공연
            </span>
            <p className="mt-[2cqw] text-[5.4cqw] leading-[1.2] font-extrabold tracking-[-0.03em]">
              연극동아리 지대로
              <br />
              정기공연 〈마술가게〉
            </p>
            <p className="mt-[1.4cqw] text-[3cqw] text-hero-muted">
              11/28 – 11/30 · 대강당
            </p>
          </div>
        </div>
      </MiniTv>
    </PreviewArea>
  );
}

export function EventPreview() {
  return (
    <PreviewArea tint="bg-type-event-subtle">
      <MiniTv position="이벤트 1 / 2">
        <div className="flex h-full flex-col justify-center gap-[2.4cqw] rounded-[2cqw] bg-hero-raised px-[5.5cqw]">
          <span className="self-start rounded-pill bg-accent px-[2.2cqw] py-[0.8cqw] text-[2.6cqw] font-bold text-accent-on">
            합격 축하
          </span>
          <p className="text-[7.4cqw] leading-[1.15] font-extrabold tracking-[-0.035em]">
            수현아, 합격 축하해
          </p>
          <p className="text-[3.4cqw] text-hero-muted">연구실 동기들이</p>
        </div>
      </MiniTv>
    </PreviewArea>
  );
}

export function StoryPreview() {
  return (
    <PreviewArea tint="bg-type-story-subtle">
      <MiniTv position="제보 1–2 / 7">
        <div className="grid h-full grid-cols-2 gap-[2.4cqw]">
          <MiniStoryCard number={128} tag="칭찬">
            B동 세탁실 건조기 2번이 고쳐졌어요!
          </MiniStoryCard>
          <MiniStoryCard number={127} tag="분실물">
            A동 로비에서 파란 텀블러를 주웠어요
          </MiniStoryCard>
        </div>
      </MiniTv>
    </PreviewArea>
  );
}

function MiniStoryCard({
  number,
  tag,
  children,
}: {
  number: number;
  tag: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-[2cqw] bg-hero-raised p-[3.4cqw]">
      <div className="flex items-center gap-[1.4cqw] text-[2.4cqw]">
        <span className="rounded-pill bg-type-story-bar px-[1.6cqw] py-[0.4cqw] font-bold text-stage">
          {tag}
        </span>
        <span className="text-zinc-400">#{number}</span>
      </div>
      <p className="mt-[2.4cqw] text-[4cqw] leading-[1.4] font-bold">{children}</p>
    </div>
  );
}
