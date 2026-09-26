import { Link } from "react-router";
import { to } from "@/shared/config/routes";
import { Panel } from "@/shared/components";
import { Button } from "@/shared/ui/button";

/**
 * 경로는 열려 있지만 화면이 아직 없는 곳.
 *
 * 라우팅과 권한 경계를 먼저 세우는 단계라 목적지가 비어 있을 수 있다. 빈 화면을
 * 보여주는 대신 무엇이 준비 중인지 알린다.
 */
interface ComingSoonPageProps {
  title: string;
  description: string;
}

export function ComingSoonPage({ title, description }: ComingSoonPageProps) {
  return (
    <Panel>
      <div className="flex flex-col items-start gap-3 py-6">
        <h1 className="text-title text-ink">{title}</h1>
        <p className="text-body text-ink-muted">{description}</p>
        <Button variant="secondary" size="sm" asChild className="mt-1">
          <Link to={to.dashboard()}>홈으로</Link>
        </Button>
      </div>
    </Panel>
  );
}
