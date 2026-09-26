import type { ReactNode } from "react";
import { ScaledStage } from "@/entities/poster/ui/ScaledStage";
import {
  TV_STAGE_HEIGHT,
  TV_STAGE_WIDTH,
} from "@/entities/poster/ui/stage-metrics";
import { cn } from "@/shared/lib/utils";

/**
 * 실제 TV 해상도(1920x1080)를 그대로 그린 뒤 통째로 축소한다.
 *
 * 미리보기용으로 글자 크기를 따로 잡으면 실제 화면과 비율이 달라져서, 잘림이나
 * 여백 문제가 승인 뒤에야 드러난다. TV 플레이어와 같은 `ScaledStage`를 쓰므로
 * 보이는 그대로가 TV에서의 결과다. (명세 FR-SUB-03)
 */
interface DisplayPreviewFrameProps {
  children: ReactNode;
  className?: string;
}

export function DisplayPreviewFrame({
  children,
  className,
}: DisplayPreviewFrameProps) {
  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-card shadow-floating ring-1 ring-line",
        className,
      )}
      style={{ aspectRatio: `${TV_STAGE_WIDTH} / ${TV_STAGE_HEIGHT}` }}
    >
      <ScaledStage className="absolute inset-0">{children}</ScaledStage>
    </div>
  );
}
