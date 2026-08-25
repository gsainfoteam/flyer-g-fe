import { lazy, Suspense } from "react";
import { AdminLayout } from "@/app/layouts/AdminLayout";
import { DisplayLayout } from "@/app/layouts/DisplayLayout";
import { StudioLayout } from "@/app/layouts/StudioLayout";
import { paths } from "@/app/router/routes";
import { RequireRole, RequireSession } from "@/features/auth/ui/guards";
import { ComingSoonPage } from "@/pages/ComingSoonPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { DisplayPage } from "@/pages/DisplayPage";
import { LoginPage } from "@/pages/LoginPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { ReviewsPage } from "@/pages/ReviewsPage";
import { StudioPage } from "@/pages/StudioPage";
import { SubmissionsPage } from "@/pages/SubmissionsPage";

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
    children: [{ path: paths.display, element: <DisplayPage /> }],
  },

  { path: paths.login, element: <LoginPage /> },

  // 세션이 있어야 볼 수 있는 화면
  {
    element: <RequireSession />,
    children: [
      {
        element: <StudioLayout />,
        children: [{ path: paths.studio, element: <StudioPage /> }],
      },
      {
        element: <AdminLayout />,
        children: [
          { path: paths.dashboard, element: <DashboardPage /> },
          { path: paths.submissions, element: <SubmissionsPage /> },
          {
            path: paths.submissionDetail,
            element: (
              <ComingSoonPage
                title="신청 상세는 준비 중이에요"
                description="상태 이력과 반려 사유, 취소·수정은 곧 여기에서 볼 수 있어요."
              />
            ),
          },
          // 검토는 하우스 관리자와 운영자만 볼 수 있다.
          {
            element: <RequireRole allow={["REVIEWER", "SUPER_ADMIN"]} />,
            children: [
              { path: paths.reviews, element: <ReviewsPage /> },
              {
                path: paths.reviewDetail,
                element: (
                  <ComingSoonPage
                    title="검토 상세는 준비 중이에요"
                    description="포스터 원본과 TV 미리보기를 함께 놓고 승인·반려하는 화면이 곧 열려요."
                  />
                ),
              },
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
