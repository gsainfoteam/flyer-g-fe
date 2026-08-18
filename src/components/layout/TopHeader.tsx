import { Plus } from "lucide-react";
import { Button } from "@/shared/ui/button";

/**
 * 사용자 이름과 역할은 Phase 01의 인증 세션에서 받아온다.
 * 지금은 자리표시자이며 실제 계정 정보가 아니다.
 */
export function TopHeader() {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="flex items-center gap-2 text-title tracking-tight text-ink">
          안녕하세요, 지스트님!
          <span aria-hidden="true">👋</span>
        </h1>
        <p className="mt-1.5 text-body text-ink-muted">
          전단지 관리 현황을 확인하고, 새 콘텐츠를 등록해 보세요.
        </p>
      </div>

      <div className="flex items-center gap-2.5">
        <div className="flex items-center gap-2.5 rounded-pill bg-surface py-1.5 pl-1.5 pr-3.5 shadow-card ring-1 ring-line">
          <div
            className="grid size-8 place-items-center rounded-pill bg-brand text-label font-black text-brand-on"
            aria-hidden="true"
          >
            지
          </div>
          <div className="hidden leading-tight sm:block">
            <p className="text-label font-bold text-ink">지스트님</p>
            <p className="text-caption text-ink-subtle">관리자</p>
          </div>
        </div>
        <Button asChild size="lg">
          <a href="/studio">
            <Plus aria-hidden="true" />
            콘텐츠 등록
          </a>
        </Button>
      </div>
    </header>
  );
}
