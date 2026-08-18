import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

interface SectionHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  /** 제목 오른쪽에 놓을 작업 버튼 등 */
  action?: ReactNode;
  /** 제목의 heading level. 문서 구조에 맞게 지정한다. */
  as?: "h1" | "h2" | "h3";
  className?: string;
}

/** 화면·섹션 제목과 설명, 작업 버튼의 배치를 통일한다. */
export function SectionHeader({
  title,
  description,
  action,
  as: Heading = "h2",
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn("flex items-start justify-between gap-4", className)}
    >
      <div className="min-w-0">
        <Heading className="text-heading text-foreground">{title}</Heading>
        {description && (
          <p className="mt-1 text-label text-ink-muted">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
