import { useState } from "react";
import { LAYOUT_TYPES } from "@/entities/playlist/model/types";
import type { LayoutType } from "@/entities/playlist/model/types";
import { LAYOUT_LABELS } from "@/entities/playlist/model/rotation";
import type { PosterRenderModel } from "@/entities/poster";
import { DisplayStage } from "@/entities/poster/ui/DisplayStage";
import { DisplayPreviewFrame } from "@/features/display-preview/ui/DisplayPreviewFrame";
import { useRotation } from "@/features/display/model/use-rotation";
import { DEMO_SAMPLES, demoPosterUrl } from "@/mocks/demo-content";
import { categoryNameOf } from "@/mocks/reference";
import { Button } from "@/shared/ui/button";

/**
 * 개발 전용. 비율이 섞인 게시물로 TV 화면 전환을 실제로 돌려 본다.
 *
 * 실제 포스터 다섯 장(`public/posters`)과 개발 서버 전용 예시 게시물
 * (`mocks/demo-content.ts`)을 섞는다. mock 서버에 예시 게시물을 켜지 않아도 여기서는
 * 늘 볼 수 있다.
 */
const REAL_POSTERS: [string, string, string, string, number, number][] = [
  ["vesper", "VESPER 피아노 정기공연", "공연", "중앙도서관 소극장", 828, 1171],
  [
    "research-assistant",
    "연구보조 학생 모집",
    "모집",
    "온라인 접수",
    828,
    1175,
  ],
  [
    "gist-news",
    "지스트신문 22기 기자단 모집",
    "모집",
    "온라인 접수",
    828,
    1171,
  ],
  [
    "rnd-officer",
    "과학기술전문사관 석사 후보생 모집",
    "안내",
    "대학 C동 201호",
    828,
    1171,
  ],
  [
    "superficial",
    "슈퍼-피셜 신입 부원 모집",
    "동아리",
    "학생회관 305호",
    640,
    905,
  ],
];

function demoPoster(
  id: string,
  title: string,
  categoryName: string,
  location: string,
  posterUrl: string,
  width: number,
  height: number,
): PosterRenderModel {
  return {
    id,
    title,
    subtitle: null,
    categoryName,
    organizerName: "예시 단체",
    location,
    posterUrl,
    width,
    height,
    detailUrl: `https://ziggle.gistory.me/notice/${id}`,
    startAt: new Date("2026-10-01T00:00:00Z"),
    endAt: new Date("2026-10-31T00:00:00Z"),
  };
}

const real = REAL_POSTERS.map(([file, title, category, location, w, h]) =>
  demoPoster(file, title, category, location, `/posters/${file}.webp`, w, h),
);
const samples = DEMO_SAMPLES.map((sample) =>
  demoPoster(
    sample.file,
    sample.title,
    categoryNameOf(sample.categoryId),
    sample.location,
    demoPosterUrl(sample.file),
    sample.width,
    sample.height,
  ),
);

/** 실제 포스터와 예시를 번갈아 놓아 비율이 고르게 섞이게 한다. */
const POSTERS: PosterRenderModel[] = samples.flatMap((sample, index) =>
  index < real.length ? [real[index]!, sample] : [sample],
);

/** 띄울 건수. 벽이 한 쪽에 다 들어가는 경우와 여러 쪽으로 나뉘는 경우를 본다. */
const COUNTS = [1, 3, 8, 16, POSTERS.length] as const;

export function TvRotationDemo() {
  const [layout, setLayout] = useState<LayoutType>("WALL");
  const [count, setCount] = useState<number>(8);
  const [paused, setPaused] = useState(false);
  const posters = POSTERS.slice(0, count);
  const rotation = useRotation({
    posters,
    layout,
    rotationSeconds: 5,
    paused,
  });
  const frame = rotation.currentFrame;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {LAYOUT_TYPES.map((type) => (
          <Button
            key={type}
            size="sm"
            variant={layout === type ? "default" : "outline"}
            aria-pressed={layout === type}
            onClick={() => setLayout(type)}
          >
            {LAYOUT_LABELS[type]}
          </Button>
        ))}
        <span className="ml-3 text-caption text-ink-muted">건수</span>
        {COUNTS.map((value) => (
          <Button
            key={value}
            size="sm"
            variant={count === value ? "secondary" : "ghost"}
            aria-pressed={count === value}
            onClick={() => setCount(value)}
          >
            {value === POSTERS.length ? `전체 ${value}` : value}
          </Button>
        ))}
        <span className="ml-3" />
        <Button size="sm" variant="ghost" onClick={() => setPaused(!paused)}>
          {paused ? "재생" : "일시정지"}
        </Button>
        <Button size="sm" variant="ghost" onClick={rotation.advance}>
          다음 화면
        </Button>
        <span className="text-caption text-ink-muted tabular-nums">
          {rotation.frameIndex + 1} / {rotation.frameCount}
        </span>
      </div>
      <DisplayPreviewFrame className="max-w-[960px]">
        {frame && frame.kind !== "widget" && (
          <div
            key={frame.kind === "strip" ? "strip" : frame.key}
            className="h-full animate-in duration-500 fade-in"
          >
            <DisplayStage
              frame={frame}
              posters={posters}
              deviceLabel="개발 데모"
              serverTime={null}
            />
          </div>
        )}
      </DisplayPreviewFrame>
    </div>
  );
}
