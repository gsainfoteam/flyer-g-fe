import { Link } from "react-router";
import { cn } from "@/shared/lib/utils";

/**
 * 상태별 건수.
 *
 * 카드 네 장으로 나누는 대신 한 줄의 지표 행으로 붙여 서로 비교되게 한다.
 * 각 칸은 행 폭을 고르게 나눠 갖고, 누르면 해당 상태 목록으로 간다 — 숫자가
 * 눈에 띄면 다음 행동은 "그 목록을 보는 것"이기 때문이다. 지금 처리해야 하는
 * 건수 하나만 강조색 숫자로 띄운다. 아이콘은 두지 않는다. (명세 FR-DASH-01)
 */
export interface StatusCount {
  label: string;
  value: number;
  /** 누르면 이동할 목록 경로. 없으면 정적 표시 */
  href?: string;
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
      className={cn(
        "grid grid-cols-2 overflow-hidden rounded-card border border-line bg-surface shadow-card",
        "sm:flex sm:items-stretch sm:divide-x sm:divide-line",
        className,
      )}
      role="group"
      aria-label="상태별 건수"
    >
      {counts.map((count) => {
        const emphasized = count.emphasis && count.value > 0;
        const body = (
          <>
            <span className="text-caption text-ink-muted">{count.label}</span>
            <span
              className={cn(
                "text-[26px] leading-none font-extrabold tracking-tight tabular-nums",
                emphasized ? "text-accent" : "text-ink",
              )}
            >
              {count.value}
            </span>
          </>
        );
        const cellClassName = "flex flex-col gap-1.5 px-5 py-4 sm:flex-1";

        return count.href ? (
          <Link
            key={count.label}
            to={count.href}
            className={cn(
              cellClassName,
              "transition-colors duration-150 hover:bg-surface-muted/60",
              "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus",
            )}
          >
            {body}
          </Link>
        ) : (
          <span key={count.label} className={cellClassName}>
            {body}
          </span>
        );
      })}
      {trailing && (
        <div className="col-span-2 flex items-center justify-end border-t border-line px-4 py-1.5 sm:shrink-0 sm:border-t-0 sm:py-0">
          {trailing}
        </div>
      )}
    </div>
  );
}
