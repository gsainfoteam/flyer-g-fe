import type { ReactNode } from "react";
import { LiveClock } from "@/shared/components/LiveClock";
import { STAGE_HEADER_HEIGHT } from "@/entities/poster/ui/stage-metrics";

/**
 * TV 화면 머리 줄. 모아 보기·크게 보기·흐르는 띠가 같은 자리를 써서 화면이
 * 바뀌어도 머리가 흔들리지 않는다. 오른쪽(`children`)은 화면마다 다르다.
 *
 * 왼쪽에는 기기 이름과 오늘 날짜, 오른쪽에는 게시 건수나 현재 순서를 둔다.
 */

interface StageHeaderProps {
  deviceLabel: string | null;
  serverTime: Date | null;
  clockTicking?: boolean;
  children?: ReactNode;
}

export function StageHeader({
  deviceLabel,
  serverTime,
  clockTicking = false,
  children,
}: StageHeaderProps) {
  return (
    <div
      className="flex shrink-0 items-center gap-4"
      style={{ height: STAGE_HEADER_HEIGHT }}
    >
      <div className="flex min-w-0 items-center gap-3 text-[24px] text-ink-subtle">
        {deviceLabel && (
          <>
            <span className="truncate">{deviceLabel}</span>
            <span aria-hidden="true">·</span>
          </>
        )}
        <LiveClock now={serverTime ?? undefined} ticking={clockTicking} format="date" className="shrink-0" />
      </div>
      {children && <div className="ml-auto flex min-w-0 items-center">{children}</div>}
    </div>
  );
}
