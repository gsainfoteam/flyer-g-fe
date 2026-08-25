import { Link } from "react-router";
import { to } from "@/app/router/routes";
import { Button } from "@/shared/ui/button";

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-start justify-center gap-3 bg-canvas px-6 text-ink lg:px-10">
      <div className="mx-auto w-full max-w-content">
        <h1 className="text-display text-ink">찾는 화면이 없어요</h1>
        <p className="mt-2 text-body text-ink-muted">
          주소가 바뀌었거나, 신청이 삭제되었을 수 있어요.
        </p>
        <Button asChild className="mt-5">
          <Link to={to.dashboard()}>홈으로</Link>
        </Button>
      </div>
    </div>
  );
}
