import { cn } from "@/shared/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  subtitle?: boolean;
  className?: string;
}

const sizeMap = {
  sm: { name: "text-[0.9375rem]", sub: "text-caption" },
  md: { name: "text-[1.0625rem]", sub: "text-caption" },
  lg: { name: "text-[1.75rem]", sub: "text-label" },
};

export function Logo({ size = "md", subtitle = true, className }: LogoProps) {
  const s = sizeMap[size];
  return (
    <a href="/" className={cn("inline-flex flex-col", className)}>
      <span className={cn("font-semibold tracking-tight text-ink", s.name)}>
        <span className="text-accent-brand">G</span>IST 전단지
      </span>
      {subtitle && (
        <span className={cn("mt-0.5 text-ink-subtle", s.sub)}>
          기숙사 디지털 게시판
        </span>
      )}
    </a>
  );
}
