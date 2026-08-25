import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

/**
 * 흰 면 위의 내용 묶음.
 *
 * 화면의 구조는 회색 바닥과 흰 면의 대비가 만든다. 테두리를 겹쳐 그리지 않고
 * 아주 옅은 그림자로만 띄운다. 제목 줄이 필요하면 `title`을 넘긴다.
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
        "flex min-w-0 flex-col overflow-hidden rounded-card bg-surface shadow-card",
        className,
      )}
    >
      {title && (
        <div className="flex items-center justify-between gap-4 border-b border-line px-6 py-3.5">
          <h2 className="text-heading text-ink">{title}</h2>
          {action}
        </div>
      )}
      <div
        className={cn(
          "min-h-0 flex-1",
          flush ? "p-3" : "px-6 py-5",
          bodyClassName,
        )}
      >
        {children}
      </div>
    </section>
  );
}
