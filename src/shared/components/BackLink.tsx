import { ChevronLeft } from "lucide-react";
import { Link } from "react-router";
import { cn } from "@/shared/lib/utils";

/**
 * 제목 위의 돌아가기 링크. 어디로 돌아가는지 이름을 그대로 쓴다("홈", "내 콘텐츠").
 * 제목 위 작은 글은 꾸밈 라벨처럼 보이기 쉬워서 화살표로 누를 수 있다는 걸 보인다.
 */
export function BackLink({
  to,
  children,
  className,
}: {
  to: string;
  children: string;
  className?: string;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "-ml-1 inline-flex items-center gap-0.5 rounded-control py-0.5 pr-1.5 text-label text-ink-muted transition-colors hover:text-ink",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
        className,
      )}
    >
      <ChevronLeft size={16} strokeWidth={2.25} aria-hidden="true" />
      {children}
    </Link>
  );
}
