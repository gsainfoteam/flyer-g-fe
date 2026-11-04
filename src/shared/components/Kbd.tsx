import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

/** 키보드 단축키 한 개. "J" "A" */
export function Kbd({
  children,
  className,
  "aria-hidden": ariaHidden,
}: {
  children: ReactNode;
  className?: string;
  /** 버튼 안의 단축키처럼 이름에 섞이면 안 될 때. 버튼에 `aria-keyshortcuts`를 단다. */
  "aria-hidden"?: boolean;
}) {
  return (
    <kbd
      aria-hidden={ariaHidden}
      className={cn(
        "inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-surface px-1.5 font-sans text-overline text-ink shadow-[inset_0_-1px_0_var(--color-line-strong)] ring-1 ring-line-strong",
        className,
      )}
    >
      {children}
    </kbd>
  );
}
