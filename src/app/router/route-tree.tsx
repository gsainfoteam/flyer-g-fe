import { lazy, Suspense } from "react";
import type { ComponentType, ReactNode } from "react";
import {
  DisplayRouteErrorScreen,
  RouteErrorScreen,
} from "@/app/errors/RouteErrorScreen";
import { AdminLayout } from "@/app/layouts/AdminLayout";
import { AppShell } from "@/app/layouts/AppShell";
import { DisplayLayout } from "@/app/layouts/DisplayLayout";
import { PlayLayout } from "@/app/layouts/PlayLayout";
import { StudioLayout } from "@/app/layouts/StudioLayout";
import { paths } from "@/shared/config/routes";
import type { RouteHandle } from "@/app/router/use-document-title";
import { legacyRoutes } from "@/app/router/legacy-redirects";
import {
  RequireRole,
  RequireSession,
  SessionOrFallback,
} from "@/features/auth/ui/guards";
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
const landingPage = lazyPage(
  () => import("@/pages/LandingPage").then((m) => ({ default: m.LandingPage })),
  null,
);
const minePage = lazyPage(() =>
  import("@/pages/MinePage").then((m) => ({ default: m.MinePage })),
);
const contentsPage = lazyPage(() =>
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

const clickBattlePage = lazyPage(
  () =>
    import("@/pages/ClickBattleTvPage").then((m) => ({
      default: m.ClickBattleTvPage,
    })),
  null,
);
const shuffleboardPage = lazyPage(
  () =>
    import("@/pages/ShuffleboardTvPage").then((m) => ({
      default: m.ShuffleboardTvPage,
    })),
  null,
);
const shuffleboardPlayPage = lazyPage(() =>
  import("@/pages/ShuffleboardPlayPage").then((m) => ({
    default: m.ShuffleboardPlayPage,
  })),
);
const flyerDodgePage = lazyPage(
  () =>
    import("@/pages/FlyerDodgeTvPage").then((m) => ({
      default: m.FlyerDodgeTvPage,
    })),
  null,
);
const flyerDodgePlayPage = lazyPage(() =>
  import("@/pages/FlyerDodgePlayPage").then((m) => ({
    default: m.FlyerDodgePlayPage,
  })),
);
const quizPlayPage = lazyPage(() =>
  import("@/pages/QuizPlayPage").then((m) => ({ default: m.QuizPlayPage })),
);
const clickBattlePlayPage = lazyPage(() =>
  import("@/pages/ClickBattlePlayPage").then((m) => ({
    default: m.ClickBattlePlayPage,
  })),
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
      {
        path: paths.clickBattle,
        element: clickBattlePage,
        handle: title("클릭 배틀"),
      },
      {
        path: paths.shuffleboard,
        element: shuffleboardPage,
        handle: title("컬링"),
      },
      {
        path: paths.flyerDodge,
        element: flyerDodgePage,
        handle: title("전단지 피하기"),
      },
    ],
  },

  // 폰 참여 화면. TV의 QR로 들어오며 로그인을 요구하지 않는다.
  {
    element: <PlayLayout />,
    errorElement: <RouteErrorScreen />,
    children: [
      { path: paths.playQuiz, element: quizPlayPage, handle: title("오늘의 퀴즈") },
      {
        path: paths.playClickBattle,
        element: clickBattlePlayPage,
        handle: title("클릭 배틀"),
      },
      {
        path: paths.playShuffleboard,
        element: shuffleboardPlayPage,
        handle: title("컬링"),
      },
      {
        path: paths.playFlyerDodge,
        element: flyerDodgePlayPage,
        handle: title("전단지 피하기"),
      },
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

      // 개편 전 주소는 새 주소로 보낸다.
      ...legacyRoutes,

      // 첫 화면. 로그인 전에는 소개, 로그인하면 역할별 홈.
      {
        path: paths.home,
        element: <SessionOrFallback fallback={landingPage} />,
        children: [
          {
            element: <AdminLayout />,
            children: [{ index: true, element: dashboardPage }],
          },
        ],
      },

      // 세션이 있어야 볼 수 있는 화면
      {
        element: <RequireSession />,
        children: [
          {
            element: <StudioLayout />,
            children: [
              {
                path: paths.newPoster,
                element: studioPage,
                handle: title("포스터 올리기"),
              },
            ],
          },
          {
            element: <AdminLayout />,
            children: [
              {
                path: paths.mine,
                element: minePage,
                handle: title("내 컨텐츠"),
              },
              {
                path: paths.mineDetail,
                element: submissionDetailPage,
                handle: title("컨텐츠 상세"),
              },
              // 심사와 전체 컨텐츠는 하우스 관리자와 운영자만 볼 수 있다.
              {
                element: <RequireRole allow={["REVIEWER", "SUPER_ADMIN"]} />,
                children: [
                  {
                    path: paths.review,
                    element: reviewsPage,
                    handle: title("심사"),
                  },
                  // 목록과 고른 건을 한 화면에 둔다. 주소의 id가 오른쪽 칸이다.
                  {
                    path: paths.reviewDetail,
                    element: reviewsPage,
                    handle: title("심사"),
                  },
                  {
                    path: paths.contents,
                    element: contentsPage,
                    handle: title("전체 컨텐츠"),
                  },
                ],
              },
              // TV 관리와 설정은 운영자만 볼 수 있다.
              {
                element: <RequireRole allow={["SUPER_ADMIN"]} />,
                children: [
                  {
                    path: paths.tv,
                    handle: title("TV"),
                    element: devicesPage,
                  },
                  {
                    path: paths.roleSettings,
                    handle: title("권한 설정"),
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
