import { Outlet } from "react-router";
import { useDocumentTitle } from "@/app/router/use-document-title";
import { Logo } from "@/shared/components/Logo";

/**
 * 폰 참여 화면 셸. TV의 QR로 들어온 학생이 로그인 없이 쓴다.
 *
 * 관리 내비게이션을 두지 않는다. 한 손으로 누르는 화면이라 폭을 좁게 고정하고
 * 확대·텍스트 선택을 줄인다.
 */
export function PlayLayout() {
  useDocumentTitle();
  return (
    <div className="min-h-screen bg-canvas">
      <div className="mx-auto flex min-h-screen max-w-[480px] flex-col px-4 pt-4 pb-8">
        <header className="flex h-12 items-center">
          <Logo size="md" />
        </header>
        <main className="flex flex-1 flex-col">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
