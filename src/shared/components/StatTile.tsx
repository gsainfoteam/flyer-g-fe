import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";
import { IconTile } from "./IconTile";

/**
 * 숫자 하나와 이름. 첫 화면 옆 칸에 2×2로 놓는다.
 *
 * 누를 수 없는 정보라 테두리만 옅게 둔다. 눌러서 가는 곳이 있으면 `href` 대신
 * 바깥에서 링크로 감싼다.
 */
export function StatTile({
  icon,
  tone,
  value,
  unit,
  label,
  className,
}: {
  icon: LucideIcon;
  /** 아이콘 사각형의 색 클래스 */
  tone: string;
  value: ReactNode;
  /** 숫자 뒤에 작게 붙는 말. "/5" "건" */
  unit?: ReactNode;
  label: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col rounded-block bg-surface p-5 ring-1 ring-line",
        className,
      )}
    >
      <IconTile icon={icon} size="sm" className={tone} />
      <p className="mt-3 text-[1.875rem] leading-none font-black tracking-[-0.03em] text-ink tabular-nums">
        {value}
        {unit && (
          <span className="ml-0.5 text-subhead font-bold tracking-normal text-ink-subtle">
            {unit}
          </span>
        )}
      </p>
      <p className="mt-1 text-caption text-ink-muted">{label}</p>
    </div>
  );
}
