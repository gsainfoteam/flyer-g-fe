import { useState } from "react";
import { DisplayStage } from "@/components/display/DisplayStage";
import { FOUR_GRID_SLOT_COUNT } from "@/entities/playlist/model/types";
import type { LayoutType } from "@/entities/playlist/model/types";
import type { PosterRenderModel } from "@/entities/poster";
import { cn } from "@/shared/lib/utils";
import { DisplayPreviewFrame } from "./DisplayPreviewFrame";

/**
 * 게시 신청 미리보기 (명세 FR-SUB-03).
 *
 * 단일과 4분할을 모두 확인한다. 어느 레이아웃으로 나갈지는 기기 편성이 정하므로
 * 신청자는 두 경우를 다 보고 판단해야 한다.
 *
 * 4분할의 나머지 칸은 지금 게시 중인 다른 포스터로 채운다. 빈 칸을 두면 실제보다
 * 넉넉해 보여서 제목 잘림을 놓친다.
 */
interface DisplayPreviewProps {
  poster: PosterRenderModel;
  /** 4분할의 나머지 칸을 채울 실제 게시 중 포스터 */
  companions?: PosterRenderModel[];
  /**
   * TV 머리에 나오는 기기 이름 자리. 신청은 여러 기기에 나가므로 특정 기기 이름을
   * 지어 넣지 않고 미리보기임을 밝힌다.
   */
  deviceLabel?: string;
  serverTime: Date;
}

const LAYOUT_LABELS: Record<LayoutType, string> = {
  SINGLE: "단일",
  FOUR_GRID: "4분할",
};

export function DisplayPreview({
  poster,
  companions = [],
  deviceLabel = "미리보기",
  serverTime,
}: DisplayPreviewProps) {
  const [layout, setLayout] = useState<LayoutType>("SINGLE");

  const posters =
    layout === "FOUR_GRID"
      ? [
          poster,
          ...companions.filter((item) => item.id !== poster.id),
        ].slice(0, FOUR_GRID_SLOT_COUNT)
      : [poster];

  return (
    <div className="flex min-h-0 w-full flex-col items-center gap-4">
      {/* 전환할 패널이 따로 없는 토글이라 tab 대신 pressed 버튼을 쓴다. */}
      <div
        role="group"
        aria-label="TV 레이아웃 미리보기 전환"
        className="inline-flex rounded-lg bg-surface-muted p-[3px]"
      >
        {(Object.keys(LAYOUT_LABELS) as LayoutType[]).map((type) => (
          <button
            key={type}
            type="button"
            aria-pressed={layout === type}
            onClick={() => setLayout(type)}
            className={cn(
              "rounded-[7px] px-3.5 py-1 text-label font-semibold transition",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
              layout === type
                ? "bg-surface text-ink shadow-card"
                : "text-ink-muted hover:text-ink",
            )}
          >
            {LAYOUT_LABELS[type]}
          </button>
        ))}
      </div>

      <DisplayPreviewFrame className="max-w-[900px]">
        <DisplayStage
          layout={layout}
          posters={posters}
          deviceLabel={deviceLabel}
          serverTime={serverTime}
        />
      </DisplayPreviewFrame>

      <p className="text-caption text-ink-muted">
        {layout === "FOUR_GRID"
          ? "왼쪽 첫 칸이 신청 중인 포스터입니다. 나머지는 지금 게시 중인 다른 포스터예요."
          : "실제 TV와 같은 1920×1080 화면을 축소해 보여줍니다."}
      </p>
    </div>
  );
}
