interface LogoProps {
  size?: "sm" | "md" | "lg";
  subtitle?: boolean;
}

const sizeMap = {
  sm: { gist: "text-lg", flyer: "text-lg", sub: "text-[10px]" },
  md: { gist: "text-xl", flyer: "text-xl", sub: "text-[11px]" },
  lg: { gist: "text-2xl", flyer: "text-2xl", sub: "text-xs" },
};

export function Logo({ size = "md", subtitle = true }: LogoProps) {
  const s = sizeMap[size];
  return (
    <a href="/" className="flex items-center gap-2.5">
      <div className="flex flex-col">
        <div className="flex items-baseline gap-1.5 leading-none">
          <span className={`font-black tracking-tight ${s.gist}`}>
            <span className="text-[#F15A24]">G</span>
            <span className="text-gray-900">IST</span>
          </span>
          <span className={`font-black tracking-tight text-gray-900 ${s.flyer}`}>
            전단지
          </span>
        </div>
        {subtitle && (
          <span className={`mt-1 font-bold text-gray-400 ${s.sub}`}>
            GIST 디지털 게시판
          </span>
        )}
      </div>
    </a>
  );
}
