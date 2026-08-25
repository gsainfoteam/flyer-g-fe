import { cn } from "@/shared/lib/utils";

/**
 * 상태별 건수.
 *
 * 카드 네 장으로 나누는 대신 한 줄에 붙여 서로 비교되게 한다. 지금 처리해야 하는
 * 건수 하나만 강조색으로 띄우고 나머지는 중성으로 둔다. 아이콘은 두지 않는다 —
 * 여기서 읽어야 하는 것은 숫자다. (명세 FR-DASH-01)
 */
export interface StatusCount {
  label: string;
  value: number;
  /** 지금 행동해야 하는 항목. 화면당 하나만 쓴다. */
  emphasis?: boolean;
}

interface StatusCountBarProps {
  counts: StatusCount[];
  /** 오른쪽 끝에 놓을 전체 보기 링크 등 */
  trailing?: React.ReactNode;
  className?: string;
}

export function StatusCountBar({
  counts,
  trailing,
  className,
}: StatusCountBarProps) {
  return (
    <div
      className={cn("flex flex-wrap items-center gap-1", className)}
      role="group"
      aria-label="상태별 건수"
    >
      {counts.map((count) => {
        const emphasized = count.emphasis && count.value > 0;
        return (
          <span
            key={count.label}
            className={cn(
              "inline-flex items-baseline gap-2 rounded-pill px-4 py-2",
              emphasized ? "bg-accent text-accent-on" : "text-ink-muted",
            )}
          >
            <span className="text-label font-semibold">{count.label}</span>
            <span
              className={cn(
                "text-metric tabular-nums",
                emphasized ? "text-accent-on" : "text-ink",
              )}
            >
              {count.value}
            </span>
          </span>
        );
      })}
      {trailing && <div className="ml-auto pr-2">{trailing}</div>}
    </div>
  );
}
