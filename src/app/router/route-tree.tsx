import { lazy, Suspense } from "react";
import type { ComponentType, ReactNode } from "react";
import {
  DisplayRouteErrorScreen,
  RouteErrorScreen,
} from "@/app/errors/RouteErrorScreen";
import { AdminLayout } from "@/app/layouts/AdminLayout";
import { AppShell } from "@/app/layouts/AppShell";
import { DisplayLayout } from "@/app/layouts/DisplayLayout";
import { StudioLayout } from "@/app/layouts/StudioLayout";
import { paths } from "@/shared/config/routes";
import type { RouteHandle } from "@/app/router/use-document-title";
import { RequireRole, RequireSession } from "@/features/auth/ui/guards";
import { AuthCallbackPage } from "@/pages/AuthCallbackPage";
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
const devicesPage = lazyPage(() =>
  import("@/pages/DevicesPage").then((m) => ({ default: m.DevicesPage })),
);
const usersPage = lazyPage(() =>
  import("@/pages/UsersPage").then((m) => ({ default: m.UsersPage })),
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

const title = (value: string): RouteHandle => ({ title: value });

export const routeTree = [
  // TV 플레이어. 사용자 세션을 요구하지 않는다.
  {
    element: <DisplayLayout />,
    // 화면 조각을 못 받는 등 route 단계의 오류. TV에는 버튼 대신 자동 새로고침.
    errorElement: <DisplayRouteErrorScreen />,
    children: [
      { path: paths.display, element: displayPage, handle: title("TV") },
    ],
  },

  {
    element: <AppShell />,
    errorElement: <RouteErrorScreen />,
    children: [
      { path: paths.login, element: <LoginPage />, handle: title("로그인") },
      {
        path: paths.authCallback,
        element: <AuthCallbackPage />,
        handle: title("로그인"),
      },

      // 세션이 있어야 볼 수 있는 화면
      {
        element: <RequireSession />,
        children: [
          {
            element: <StudioLayout />,
            children: [
              {
                path: paths.studio,
                element: studioPage,
                handle: title("게시 신청"),
              },
            ],
          },
          {
            element: <AdminLayout />,
            children: [
              { path: paths.dashboard, element: dashboardPage },
              {
                path: paths.submissions,
                element: submissionsPage,
                handle: title("신청 목록"),
              },
              {
                path: paths.submissionDetail,
                element: submissionDetailPage,
                handle: title("신청 상세"),
              },
              // 검토는 하우스 관리자와 운영자만 볼 수 있다.
              {
                element: <RequireRole allow={["REVIEWER", "SUPER_ADMIN"]} />,
                children: [
                  {
                    path: paths.reviews,
                    element: reviewsPage,
                    handle: title("승인 대기"),
                  },
                  {
                    path: paths.reviewDetail,
                    element: reviewDetailPage,
                    handle: title("검토"),
                  },
                ],
              },
              // 기기 관리와 사용자 권한은 운영자만 볼 수 있다.
              {
                element: <RequireRole allow={["SUPER_ADMIN"]} />,
                children: [
                  {
                    path: paths.displays,
                    handle: title("기기 관리"),
                    element: devicesPage,
                  },
                  {
                    path: paths.users,
                    handle: title("사용자 권한"),
                    element: usersPage,
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
              handle: title("컴포넌트 카탈로그"),
              element: (
                <Suspense fallback={null}>
                  <ComponentCatalog />
                </Suspense>
              ),
            },
          ]
        : []),

      { path: "*", element: <NotFoundPage />, handle: title("찾을 수 없음") },
    ],
  },
];
