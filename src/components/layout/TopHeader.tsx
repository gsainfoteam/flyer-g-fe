import { Plus } from "lucide-react";
import { Button } from "@/shared/ui/button";

/**
 * 화면 머리말.
 *
 * 인사말 대신 지금 보고 있는 화면과 할 수 있는 일을 알린다.
 * 사용자 이름과 역할은 Phase 01의 인증 세션에서 받아온다. 지금은 자리표시자다.
 */
interface TopHeaderProps {
  title: string;
  description: string;
}

export function TopHeader({ title, description }: TopHeaderProps) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-title tracking-tight text-ink">{title}</h1>
        <p className="mt-0.5 text-label text-ink-muted">{description}</p>
      </div>

      <div className="flex items-center gap-3">
        <p className="hidden text-caption text-ink-muted sm:block">
          지스트님 · 관리자
        </p>
        <Button asChild>
          <a href="/studio">
            <Plus aria-hidden="true" />
            콘텐츠 등록
          </a>
        </Button>
      </div>
    </header>
  );
}
