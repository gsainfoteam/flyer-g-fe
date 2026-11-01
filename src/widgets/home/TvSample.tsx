import { Pause, Play } from "lucide-react";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { LiveClock, LogoMark } from "@/shared/components";
import { cn } from "@/shared/lib/utils";
import infoteamDesigner from "./samples/infoteam-designer.webp";
import infoteamRecruiting from "./samples/infoteam-recruiting.webp";
import lumiere from "./samples/lumiere-2026.webp";
import magicShop from "./samples/magic-shop.webp";
import wingSurvival from "./samples/wing-survival.webp";

/**
 * 소개 화면의 TV 모습. 예시 데이터로 그린 장면이 실제 TV처럼 돌아간다(실제 편성이
 * 아니다). (기획 3-1)
 *
 * 장면: 포스터 크게 → 포스터 모아 보기(띠가 흐름) → 소식 제보. 장면이 바뀔
 * 때는 짧은 페이드 하나만 쓰고, 정보줄의 진행 막대가 다음 장면까지 남은 시간을
 * 보여 준다. 틀(머리 줄·정보줄)은 그대로 두고 안쪽만 바뀐다.
 *
 * 저절로 넘어가는 화면이라 멈춤 버튼과 장면 고르기를 둔다. 움직임 줄이기를 켠
 * 사용자에게는 넘기지 않고 첫 장면에 멈춰 있다. 글자 크기는 컨테이너 폭 기준(cqw)이라
 * 어느 폭에서도 1920×1080 비율 그대로 보인다.
 *
 * 포스터는 교내 단체의 실제 포스터 예시다(긴 변 900px로 줄인 사본). 비율이 제각각이라
 * 띠에서는 높이만 맞추고 원래 비율 그대로 놓는다.
 */
const SCENE_MS = 5000;

interface SamplePoster {
  src: string;
  /** 원본 비율(가로 / 세로) */
  ratio: number;
}

/** 첫 장이 "포스터 크게" 장면에 나온다. */
const POSTERS: SamplePoster[] = [
  { src: infoteamRecruiting, ratio: 1190 / 1488 },
  { src: wingSurvival, ratio: 1188 / 1682 },
  { src: infoteamDesigner, ratio: 1 },
  { src: lumiere, ratio: 1080 / 1440 },
  { src: magicShop, ratio: 1280 / 1707 },
];

type SceneKey = "spotlight" | "wall" | "story";

const SCENES: { key: SceneKey; label: string; position: string }[] = [
  { key: "spotlight", label: "포스터", position: "포스터 1 / 5" },
  { key: "wall", label: "모아 보기", position: "모아 보기 1 / 2" },
  { key: "story", label: "소식 제보", position: "제보 1–2 / 7" },
];

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

export function TvSample() {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(() => !prefersReducedMotion());

  // 뒤 장면의 포스터를 미리 받아 둔다. 장면이 바뀐 뒤에 받으면 빈 칸이 잠깐 보인다.
  useEffect(() => {
    for (const poster of POSTERS) new Image().src = poster.src;
  }, []);

  useEffect(() => {
    if (!playing) return;
    const id = window.setTimeout(
      () => setIndex((current) => (current + 1) % SCENES.length),
      SCENE_MS,
    );
    return () => window.clearTimeout(id);
  }, [index, playing]);

  const scene = SCENES[index]!;
  const next = SCENES[(index + 1) % SCENES.length]!;

  return (
    <figure className="m-0 min-w-0">
      <div className="rounded-[1.125rem] bg-zinc-800 p-2.5 shadow-[0_30px_60px_rgb(0_0_0/0.45)]">
        <div className="@container" aria-hidden="true">
          <div className="flex aspect-video flex-col overflow-hidden rounded-[0.625rem] bg-stage text-hero-ink">
            <div className="flex min-h-0 flex-1 flex-col gap-[1.5cqw] px-[4.2cqw] pt-[2.9cqw] pb-[1.7cqw]">
              <div className="flex h-[2.9cqw] items-center gap-[0.8cqw] text-[1.3cqw] font-extrabold">
                <LogoMark className="size-[2.4cqw]" />
                전단지
                <span className="ml-[0.4cqw] font-normal text-zinc-400">
                  A동 로비 1
                </span>
                <span className="ml-auto font-normal text-zinc-400">
                  {scene.position}
                </span>
              </div>
              {/* key가 바뀌면 새 장면이 페이드로 들어온다. */}
              <div
                key={scene.key}
                className="min-h-0 flex-1 animate-[tv-sample-fade_400ms_ease-out]"
              >
                {scene.key === "spotlight" && <SpotlightScene />}
                {scene.key === "wall" && <WallScene playing={playing} />}
                {scene.key === "story" && <StoryScene />}
              </div>
            </div>
            <InfoBar nextLabel={next.label} index={index} playing={playing} />
          </div>
        </div>
      </div>
      <div
        aria-hidden="true"
        className="mx-auto h-2.5 w-36 rounded-b-lg bg-zinc-800"
      />
      <figcaption className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-caption text-zinc-400">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="size-1.75 rounded-full bg-accent" />
          예시 화면 · 실제 TV와 같은 틀
        </span>
        <span className="flex items-center gap-1">
          {SCENES.map((item, i) => (
            <button
              key={item.key}
              type="button"
              aria-label={`${item.label} 장면 보기`}
              aria-pressed={i === index}
              onClick={() => {
                setIndex(i);
                setPlaying(false);
              }}
              className="group inline-flex h-6 items-center px-0.5 focus-visible:outline-2 focus-visible:outline-white"
            >
              <span
                className={cn(
                  "block h-1.5 rounded-pill transition-all",
                  i === index ? "w-5 bg-white" : "w-1.5 bg-zinc-600 group-hover:bg-zinc-400",
                )}
              />
            </button>
          ))}
          <button
            type="button"
            aria-label={playing ? "장면 넘기기 멈춤" : "장면 넘기기 다시 시작"}
            onClick={() => setPlaying((value) => !value)}
            className="ml-1 inline-flex size-6 items-center justify-center rounded-full text-zinc-300 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white"
          >
            {playing ? (
              <Pause size={13} aria-hidden="true" />
            ) : (
              <Play size={13} aria-hidden="true" />
            )}
          </button>
        </span>
      </figcaption>
    </figure>
  );
}

/** 하단 정보줄. 시계·날씨·D-day·끼니와 다음 장면, 진행 막대 */
function InfoBar({
  nextLabel,
  index,
  playing,
}: {
  nextLabel: string;
  index: number;
  playing: boolean;
}) {
  return (
    <div className="flex h-[4.4cqw] flex-none items-center gap-[2.1cqw] border-t border-zinc-800 bg-hero px-[2.5cqw] text-[1.35cqw]">
      <LiveClock
        format="time"
        className="text-[1.8cqw] font-extrabold text-hero-ink"
      />
      <span>맑음 14°</span>
      <span>종강 D-50</span>
      <span className="text-zinc-300">점심 11:30–13:30</span>
      <span className="ml-auto text-zinc-300">다음 · {nextLabel}</span>
      <span className="h-[0.4cqw] w-[10.4cqw] overflow-hidden rounded-pill bg-zinc-700">
        {playing && (
          <span
            key={index}
            className="block h-full origin-left bg-accent"
            style={{
              animation: `tv-sample-progress ${SCENE_MS}ms linear forwards`,
            }}
          />
        )}
      </span>
    </div>
  );
}

/** 예시 포스터 한 장. 높이에 맞추고 원래 비율 그대로 둔다. */
function PosterImage({
  poster,
  className,
}: {
  poster: SamplePoster;
  className?: string;
}) {
  return (
    <img
      src={poster.src}
      alt=""
      draggable={false}
      style={{ aspectRatio: poster.ratio }}
      className={cn(
        "h-full w-auto flex-none rounded-[0.8cqw] object-cover shadow-[0_1.2cqw_3cqw_rgb(0_0_0/0.5)]",
        className,
      )}
    />
  );
}

function SpotlightScene() {
  return (
    <div className="flex h-full items-center gap-[4cqw]">
      <PosterImage poster={POSTERS[0]!} />
      <div className="min-w-0 flex-1">
        <span className="inline-flex rounded-pill bg-type-poster-bar px-[1.2cqw] py-[0.4cqw] text-[1.3cqw] font-bold text-white">
          모집
        </span>
        <p className="mt-[1.4cqw] text-[3.4cqw] leading-[1.2] font-extrabold tracking-[-0.03em]">
          2026 가을학기 인포팀
          <br />
          신입부원 리크루팅
        </p>
        <p className="mt-[0.8cqw] text-[1.8cqw] text-hero-muted">
          개발자 · 디자이너 모집 · 배우고 싶은 분도 환영
        </p>
      </div>
    </div>
  );
}

/** 포스터가 옆으로 흐르는 띠. 같은 목록을 두 번 이어 붙여 끊김 없이 돈다. */
/** 띠는 일시정지와 움직임 줄이기를 따른다. 저절로 움직이는 내용은 멈출 수 있어야 한다. */
function WallScene({ playing }: { playing: boolean }) {
  return (
    <div className="flex h-full items-center overflow-hidden">
      <div
        className={cn(
          "flex h-[82%] w-max animate-tv-sample-strip gap-[2cqw] motion-reduce:animate-none",
          !playing && "[animation-play-state:paused]",
        )}
      >
        {[...POSTERS, ...POSTERS].map((poster, i) => (
          <PosterImage key={i} poster={poster} />
        ))}
      </div>
    </div>
  );
}

function StoryScene() {
  return (
    <SceneCard tag="소식 제보" note="이름 없이 전하는 기숙사 소식">
      <div className="grid h-full grid-cols-2 gap-[1.6cqw]">
        <StoryCard number={128} tag="칭찬">
          B동 3층 세탁실 건조기 2번이 고쳐졌어요! 고쳐 주신 분 감사합니다.
        </StoryCard>
        <StoryCard number={127} tag="분실물">
          A동 로비 소파에서 파란 텀블러를 주웠어요. 하우스오피스에 맡겨 둘게요.
        </StoryCard>
      </div>
    </SceneCard>
  );
}

function StoryCard({
  number,
  tag,
  children,
}: {
  number: number;
  tag: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-[1cqw] bg-hero-raised p-[1.8cqw]">
      <div className="flex items-center gap-[0.8cqw] text-[1.2cqw]">
        <span className="rounded-pill bg-type-story-bar px-[0.9cqw] py-[0.25cqw] font-bold text-stage">
          {tag}
        </span>
        <span className="text-zinc-400">#{number}</span>
      </div>
      <p className="mt-[1.2cqw] text-[2cqw] leading-[1.45] font-bold">{children}</p>
    </div>
  );
}

/** 카드 틀(PR #36): 빨간 말머리 + 보조 문구 */
function SceneCard({
  tag,
  note,
  children,
}: {
  tag: string;
  note: string;
  children: ReactNode;
}) {
  return (
    <div className="flex h-full flex-col gap-[1.4cqw] rounded-[1.25cqw] bg-hero-raised/60 px-[3.6cqw] py-[2.6cqw]">
      <div className="flex items-center gap-[1cqw]">
        <span className="rounded-pill bg-accent px-[1.3cqw] py-[0.45cqw] text-[1.45cqw] font-bold text-accent-on">
          {tag}
        </span>
        <span className="text-[1.6cqw] text-hero-muted">{note}</span>
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}
