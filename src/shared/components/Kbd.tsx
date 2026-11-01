import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

/** 키보드 단축키 한 개. "J" "A" */
export function Kbd({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <kbd
      className={cn(
        "inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-surface px-1.5 font-sans text-overline text-ink shadow-[inset_0_-1px_0_var(--color-line-strong)] ring-1 ring-line-strong",
        className,
      )}
    >
      {children}
    </kbd>
  );
}
