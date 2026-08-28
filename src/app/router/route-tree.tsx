import { lazy, Suspense } from "react";
import type { ComponentType, ReactNode } from "react";
import { AdminLayout } from "@/app/layouts/AdminLayout";
import { DisplayLayout } from "@/app/layouts/DisplayLayout";
import { StudioLayout } from "@/app/layouts/StudioLayout";
import { paths } from "@/app/router/routes";
import { RequireRole, RequireSession } from "@/features/auth/ui/guards";
import { ComingSoonPage } from "@/pages/ComingSoonPage";
import { LoginPage } from "@/pages/LoginPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { LoadingState } from "@/shared/components";

/**
 * 화면 단위 code split (Phase 07 성능).
 *
 * TV 기기는 플레이어 화면만, 게시자는 관리 화면만 쓴다. 서로의 코드를 내려받게
 * 하지 않는다. QR·업로드 검증처럼 큰 의존성은 해당 chunk에만 담긴다.
 */
function lazyPage(
  load: () => Promise<{ default: ComponentType }>,
  fallback: ReactNode = <LoadingState rows={4} />,
): ReactNode {
  const Page = lazy(load);
  return (
    <Suspense fallback={fallback}>
      <Page />
    </Suspense>
  );
}

const dashboardPage = lazyPage(() =>
  import("@/pages/DashboardPage").then((m) => ({ default: m.DashboardPage })),
);
const submissionsPage = lazyPage(() =>
  import("@/pages/SubmissionsPage").then((m) => ({
    default: m.SubmissionsPage,
  })),
);
const submissionDetailPage = lazyPage(() =>
  import("@/pages/SubmissionDetailPage").then((m) => ({
    default: m.SubmissionDetailPage,
  })),
);
const reviewsPage = lazyPage(() =>
  import("@/pages/ReviewsPage").then((m) => ({ default: m.ReviewsPage })),
);
const reviewDetailPage = lazyPage(() =>
  import("@/pages/ReviewDetailPage").then((m) => ({
    default: m.ReviewDetailPage,
  })),
);
const studioPage = lazyPage(() =>
  import("@/pages/StudioPage").then((m) => ({ default: m.StudioPage })),
);
// 플레이어 로딩 화면은 비워 둔다. TV에 관리용 스켈레톤을 잠깐이라도 띄우지 않는다.
const displayPage = lazyPage(
  () => import("@/pages/DisplayPage").then((m) => ({ default: m.DisplayPage })),
  null,
);

/**
 * 개발 전용 컴포넌트 카탈로그. production 빌드에서는 import 자체가 제거되어
 * 번들에 포함되지 않고 경로로도 접근할 수 없다. (Phase 00 문서 6절)
 */
const ComponentCatalog = import.meta.env.DEV
  ? lazy(() => import("@/dev/ComponentCatalog"))
  : null;

export const routeTree = [
  // TV 플레이어. 사용자 세션을 요구하지 않는다.
  {
    element: <DisplayLayout />,
    children: [{ path: paths.display, element: displayPage }],
  },

  { path: paths.login, element: <LoginPage /> },

  // 세션이 있어야 볼 수 있는 화면
  {
    element: <RequireSession />,
    children: [
      {
        element: <StudioLayout />,
        children: [{ path: paths.studio, element: studioPage }],
      },
      {
        element: <AdminLayout />,
        children: [
          { path: paths.dashboard, element: dashboardPage },
          { path: paths.submissions, element: submissionsPage },
          { path: paths.submissionDetail, element: submissionDetailPage },
          // 검토는 하우스 관리자와 운영자만 볼 수 있다.
          {
            element: <RequireRole allow={["REVIEWER", "SUPER_ADMIN"]} />,
            children: [
              { path: paths.reviews, element: reviewsPage },
              { path: paths.reviewDetail, element: reviewDetailPage },
            ],
          },
          // 기기 관리는 운영자만 볼 수 있다.
          {
            element: <RequireRole allow={["SUPER_ADMIN"]} />,
            children: [
              {
                path: paths.displays,
                element: (
                  <ComingSoonPage
                    title="기기 관리는 준비 중이에요"
                    description="위치별 디스플레이 상태와 편성 설정이 곧 여기에 들어와요."
                  />
                ),
              },
            ],
          },
        ],
      },
    ],
  },

  ...(ComponentCatalog
    ? [
        {
          path: "/catalog",
          element: (
            <Suspense fallback={null}>
              <ComponentCatalog />
            </Suspense>
          ),
        },
      ]
    : []),

  { path: "*", element: <NotFoundPage /> },
];
