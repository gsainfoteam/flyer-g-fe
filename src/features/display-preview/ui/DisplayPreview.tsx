import { useState } from "react";
import { DisplayStage } from "@/entities/poster/ui/DisplayStage";
import type { PosterRenderModel } from "@/entities/poster";
import type { DisplayFrame } from "@/entities/poster/model/frames";
import { packWallPages } from "@/entities/poster/model/wall-layout";
import { cn } from "@/shared/lib/utils";
import { DisplayPreviewFrame } from "./DisplayPreviewFrame";

/**
 * 게시 신청 미리보기 (명세 FR-SUB-03).
 *
 * TV가 이 게시물을 보여 주는 세 가지 모습을 모두 확인한다. 어느 전환 방식으로
 * 나갈지는 기기 설정이 정하고, 모아 보기 기기에서는 벽과 크게 보기가 번갈아 나온다.
 *
 * 벽과 띠의 나머지 자리는 지금 게시 중인 다른 게시물로 채운다. 비워 두면 실제보다
 * 넉넉해 보여서 작게 보이는 정도를 놓친다.
 */
interface DisplayPreviewProps {
  poster: PosterRenderModel;
  /** 벽과 띠의 나머지 자리를 채울 실제 게시 중 게시물 */
  companions?: PosterRenderModel[];
  /**
   * TV 머리에 나오는 기기 이름 자리. 신청은 여러 기기에 나가므로 특정 기기 이름을
   * 지어 넣지 않고 미리보기임을 밝힌다.
   */
  deviceLabel?: string;
  /** 모르면 시계는 기기 시각으로 흐른다. 미리보기의 시계는 모양만 보여준다. */
  serverTime: Date | null;
}

type PreviewMode = "spotlight" | "wall" | "strip";

const MODE_LABELS: Record<PreviewMode, string> = {
  spotlight: "크게",
  wall: "모아 보기",
  strip: "흐르는 띠",
};

const MODE_NOTES: Record<PreviewMode, string> = {
  spotlight: "실제 TV와 같은 1920×1080 화면을 축소해 보여줍니다.",
  wall: "모아 보기 TV는 이 벽과 한 건씩 크게 보여 주는 화면을 번갈아 보여 줘요. 나머지는 지금 게시 중인 다른 게시물이에요.",
  strip:
    "흐르는 띠 TV는 한 칸씩 밀며 가운데 한 건을 보여 줘요. 양옆은 지금 게시 중인 다른 게시물이에요.",
};

/** 벽에 함께 놓을 최대 건수. 실제 벽 한 쪽에 흔히 담기는 정도다. */
const WALL_PREVIEW_COUNT = 8;

function frameFor(
  mode: PreviewMode,
  posters: PosterRenderModel[],
): DisplayFrame {
  const [poster, ...others] = posters;
  switch (mode) {
    case "spotlight":
      return {
        kind: "spotlight",
        key: "preview",
        poster: poster!,
        upNext: others.slice(0, 3),
      };
    case "wall":
      return {
        kind: "wall",
        key: "preview",
        posters: packWallPages(posters.slice(0, WALL_PREVIEW_COUNT))[0]!,
      };
    case "strip":
      return { kind: "strip", key: "preview", focusIndex: 0 };
  }
}

export function DisplayPreview({
  poster,
  companions = [],
  deviceLabel = "미리보기",
  serverTime,
}: DisplayPreviewProps) {
  const [mode, setMode] = useState<PreviewMode>("spotlight");
  const posters = [
    poster,
    ...companions.filter((item) => item.id !== poster.id),
  ];

  return (
    <div className="flex min-h-0 w-full flex-col items-center gap-4">
      {/* 전환할 패널이 따로 없는 토글이라 tab 대신 pressed 버튼을 쓴다. */}
      <div
        role="group"
        aria-label="TV 화면 미리보기 전환"
        className="inline-flex rounded-lg bg-surface-muted p-0.75"
      >
        {(Object.keys(MODE_LABELS) as PreviewMode[]).map((type) => (
          <button
            key={type}
            type="button"
            aria-pressed={mode === type}
            onClick={() => setMode(type)}
            className={cn(
              "rounded-md px-3.5 py-1 text-label font-semibold transition",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
              mode === type
                ? "bg-surface text-ink shadow-card"
                : "text-ink-muted hover:text-ink",
            )}
          >
            {MODE_LABELS[type]}
          </button>
        ))}
      </div>

      <DisplayPreviewFrame className="max-w-[900px]">
        <DisplayStage
          frame={frameFor(mode, posters)}
          posters={posters}
          deviceLabel={deviceLabel}
          serverTime={serverTime}
        />
      </DisplayPreviewFrame>

      <p className="max-w-[900px] text-center text-caption text-ink-muted">
        {MODE_NOTES[mode]}
      </p>
    </div>
  );
}
