interface LogoProps {
  size?: "sm" | "md" | "lg";
  subtitle?: boolean;
}

const sizeMap = {
  sm: { name: "text-heading", sub: "text-caption" },
  md: { name: "text-title", sub: "text-caption" },
  lg: { name: "text-[1.75rem]", sub: "text-label" },
};

export function Logo({ size = "md", subtitle = true }: LogoProps) {
  const s = sizeMap[size];
  return (
    <a href="/" className="flex items-center gap-2.5">
      <div className="flex flex-col">
        <div className="flex items-baseline gap-1.5 leading-none">
          <span className={`font-black tracking-tight ${s.name}`}>
            <span className="text-accent-brand">G</span>
            <span className="text-ink">IST</span>
          </span>
          <span className={`font-black tracking-tight text-ink ${s.name}`}>
            전단지
          </span>
        </div>
        {subtitle && (
          <span className={`mt-1 font-bold text-ink-subtle ${s.sub}`}>
            GIST 디지털 게시판
          </span>
        )}
      </div>
    </a>
  );
}
