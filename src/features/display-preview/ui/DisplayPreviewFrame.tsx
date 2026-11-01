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
 *
 * 미리보기는 그림으로 읽힌다. TV 화면 안의 제목(h1)·글이 페이지의 제목·본문과 섞이지
 * 않게 안쪽은 보조기기에서 숨긴다. 같은 내용은 페이지의 입력·신청 내용에 글로 있다.
 */
interface DisplayPreviewFrameProps {
  children: ReactNode;
  className?: string;
  /** 보조기기가 읽는 그림 이름 */
  label?: string;
}

export function DisplayPreviewFrame({
  children,
  className,
  label = "TV 화면 미리보기",
}: DisplayPreviewFrameProps) {
  return (
    <div
      role="img"
      aria-label={label}
      className={cn(
        "relative w-full overflow-hidden rounded-card shadow-floating ring-1 ring-line",
        className,
      )}
      style={{ aspectRatio: `${TV_STAGE_WIDTH} / ${TV_STAGE_HEIGHT}` }}
    >
      <div aria-hidden="true" className="absolute inset-0">
        <ScaledStage className="absolute inset-0">{children}</ScaledStage>
      </div>
    </div>
  );
}
