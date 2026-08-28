import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

/**
 * 흰 면 위의 내용 묶음.
 *
 * 화면의 구조는 헤어라인 경계선이 만든다. 그림자는 면이 바닥에서 아주 살짝
 * 떨어져 보이는 정도만 깐다. 제목 줄이 필요하면 `title`을 넘긴다.
 */
interface PanelProps {
  title?: ReactNode;
  /** 제목 오른쪽. 건수나 전체 보기 링크 */
  action?: ReactNode;
  children: ReactNode;
  /** 본문에 기본 여백을 주지 않는다. 목록처럼 가장자리까지 쓰는 경우에 쓴다. */
  flush?: boolean;
  className?: string;
  bodyClassName?: string;
}

export function Panel({
  title,
  action,
  children,
  flush = false,
  className,
  bodyClassName,
}: PanelProps) {
  return (
    <section
      className={cn(
        "flex min-w-0 flex-col overflow-hidden rounded-card border border-line bg-surface shadow-card",
        className,
      )}
    >
      {title && (
        <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-3">
          <h2 className="text-subhead text-ink">{title}</h2>
          {action}
        </div>
      )}
      <div
        className={cn(
          "min-h-0 flex-1",
          flush ? "p-2.5" : "px-5 py-4",
          bodyClassName,
        )}
      >
        {children}
      </div>
    </section>
  );
}
