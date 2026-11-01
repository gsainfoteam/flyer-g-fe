import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

/**
 * 첫 화면의 어두운 강조 카드. 그 사람이 온 이유에 답하는 숫자 하나를 크게 둔다.
 *
 * 한 화면에 하나만 쓴다. 오른쪽 위의 빨간 원 테두리는 브랜드 강조다.
 */
export function HeroPanel({
  children,
  className,
  labelledBy,
}: {
  children: ReactNode;
  className?: string;
  labelledBy?: string;
}) {
  return (
    <section
      aria-labelledby={labelledBy}
      className={cn(
        "relative isolate min-w-0 overflow-hidden rounded-[1.375rem] bg-hero px-6 py-6 text-hero-ink sm:px-8 sm:py-7",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-20 -z-10 size-80 rounded-full border-[48px] border-accent/15"
      />
      {children}
    </section>
  );
}
