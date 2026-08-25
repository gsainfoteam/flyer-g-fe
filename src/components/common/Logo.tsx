import { cn } from "@/shared/lib/utils";

/**
 * 브랜드 마크. 강조색을 쓰는 유일한 브랜딩 요소다.
 * 나머지 화면에서 빨강은 작업과 주의에만 쓴다.
 */
interface LogoProps {
  size?: "sm" | "md" | "lg" | "tv";
  subtitle?: string | null;
  className?: string;
}

const sizeMap = {
  sm: { mark: "size-6 rounded-[8px] text-[13px]", name: "text-[15px]", gap: "gap-2" },
  md: { mark: "size-[30px] rounded-[10px] text-[16px]", name: "text-[18px]", gap: "gap-2.5" },
  lg: { mark: "size-10 rounded-[12px] text-[21px]", name: "text-[24px]", gap: "gap-3" },
  tv: { mark: "size-14 rounded-[18px] text-[30px]", name: "text-[36px]", gap: "gap-4" },
} as const;

export function Logo({ size = "md", subtitle = null, className }: LogoProps) {
  const s = sizeMap[size];

  return (
    <span className={cn("inline-flex items-center", s.gap, className)}>
      <span
        className={cn(
          "grid shrink-0 place-items-center bg-accent font-extrabold text-accent-on",
          s.mark,
        )}
        aria-hidden="true"
      >
        전
      </span>
      <span className={cn("font-extrabold tracking-tight text-ink", s.name)}>
        전단지
      </span>
      {subtitle && (
        <span className="text-caption text-ink-subtle">{subtitle}</span>
      )}
    </span>
  );
}
