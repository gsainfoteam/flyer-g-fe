import { Outlet } from "react-router";
import { getAppEnv } from "@/shared/config/env";
import { useDocumentTitle } from "@/app/router/use-document-title";

/**
 * TV를 뺀 모든 화면(로그인, 관리 화면, 게시 신청)의 바깥 틀.
 *
 * 탭 제목을 화면에 맞추고, 데모 배포에서는 맨 위에 데모임을 알린다. 데모의
 * 데이터는 브라우저 메모리에만 있어서, 모르고 쓰면 새로고침 한 번에 입력이 사라진
 * 것처럼 보인다.
 */
export function AppShell() {
  useDocumentTitle();
  const env = getAppEnv();

  return (
    <>
      {env.isDemo && env.isProduction && (
        <div
          role="note"
          className="bg-ink px-4 py-1.5 text-center text-caption text-ink-inverse"
        >
          데모 화면이에요. 입력한 내용은 이 브라우저에만 있고, 새로고침하면 처음
          상태로 돌아가요.
        </div>
      )}
      <Outlet />
    </>
  );
}
