import { useState } from "react";
import { DisplayStage } from "@/components/display/DisplayStage";
import { FOUR_GRID_SLOT_COUNT } from "@/entities/playlist/model/types";
import type { LayoutType } from "@/entities/playlist/model/types";
import type { PosterRenderModel } from "@/entities/poster";
import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/tabs";
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
  deviceLabel = "학사기숙사 A동 로비",
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
      <Tabs
        value={layout}
        onValueChange={(value) => setLayout(value as LayoutType)}
      >
        <TabsList aria-label="TV 레이아웃 미리보기 전환">
          {(Object.keys(LAYOUT_LABELS) as LayoutType[]).map((type) => (
            <TabsTrigger key={type} value={type}>
              {LAYOUT_LABELS[type]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

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
