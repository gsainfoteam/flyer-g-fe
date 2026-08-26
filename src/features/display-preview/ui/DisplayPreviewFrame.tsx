import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  TV_STAGE_HEIGHT,
  TV_STAGE_PADDING,
  TV_STAGE_WIDTH,
} from "@/components/display/DisplayStage";
import { cn } from "@/shared/lib/utils";

/**
 * 실제 TV 해상도(1920x1080)를 그대로 그린 뒤 통째로 축소한다.
 *
 * 미리보기용으로 글자 크기를 따로 잡으면 실제 화면과 비율이 달라져서, 잘림이나
 * 여백 문제가 승인 뒤에야 드러난다. 축소만 하면 보이는 그대로가 TV에서의 결과다.
 * (명세 FR-SUB-03)
 */
interface DisplayPreviewFrameProps {
  children: ReactNode;
  className?: string;
}

export function DisplayPreviewFrame({
  children,
  className,
}: DisplayPreviewFrameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const update = () => {
      const { width } = container.getBoundingClientRect();
      // 측정 전(0)에는 줄이지 않는다. 0을 곱하면 화면이 사라진다.
      if (width > 0) setScale(width / TV_STAGE_WIDTH);
    };

    update();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(update);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full overflow-hidden rounded-card shadow-floating ring-1 ring-line",
        className,
      )}
      style={{ aspectRatio: `${TV_STAGE_WIDTH} / ${TV_STAGE_HEIGHT}` }}
    >
      <div
        className="tv-surface absolute top-0 left-0 origin-top-left text-ink"
        style={{
          width: TV_STAGE_WIDTH,
          height: TV_STAGE_HEIGHT,
          padding: TV_STAGE_PADDING,
          transform: `scale(${scale})`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
