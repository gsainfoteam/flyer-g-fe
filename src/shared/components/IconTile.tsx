import type { LucideIcon } from "lucide-react";
import { cn } from "@/shared/lib/utils";

export type IconTileSize = "sm" | "md" | "lg";

const SIZE: Record<IconTileSize, { box: string; icon: number }> = {
  sm: { box: "size-8 rounded-[0.625rem]", icon: 16 },
  md: { box: "size-10 rounded-tile", icon: 20 },
  lg: { box: "size-12 rounded-[0.875rem]", icon: 22 },
};

/**
 * 색이 있는 아이콘 사각형. 종류·상태·행동처럼 의미가 있는 자리에만 쓴다.
 * 색은 `className`으로 넘긴다(예: `bg-success-subtle text-success-strong`).
 */
export function IconTile({
  icon: Icon,
  size = "md",
  className,
  label,
}: {
  icon: LucideIcon;
  size?: IconTileSize;
  className?: string;
  /** 아이콘만으로 뜻을 전할 때의 이름. 옆에 글이 있으면 비운다. */
  label?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center",
        SIZE[size].box,
        className,
      )}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <Icon size={SIZE[size].icon} strokeWidth={2} aria-hidden="true" />
    </span>
  );
}
