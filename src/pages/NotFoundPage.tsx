import { Link } from "react-router";
import { to } from "@/shared/config/routes";
import { Button } from "@/shared/ui/button";

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-start justify-center gap-3 bg-canvas px-6 text-ink lg:px-10">
      <div className="mx-auto w-full max-w-content">
        <h1 className="text-display text-ink">페이지를 찾을 수 없습니다</h1>
        <p className="mt-2 text-body text-ink-muted">
          주소가 변경되었거나 신청이 삭제되었을 수 있습니다.
        </p>
        <Button asChild className="mt-5">
          <Link to={to.home()}>홈으로</Link>
        </Button>
      </div>
    </div>
  );
}
