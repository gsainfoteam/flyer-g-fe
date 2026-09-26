import { QueryClient } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router";
import { AppProviders } from "@/app/providers/AppProviders";
import { routeTree } from "@/app/router/route-tree";
import { createMockAuthAdapter } from "@/features/auth/api/mock-auth";
import type { Role } from "@/features/auth/model/types";
import { createMemoryHeartbeatLog } from "@/mocks/heartbeats";
import {
  createMockRepositories,
  isMockRepositories,
} from "@/mocks/repositories";
import { createFakeUploadService } from "@/features/media-upload/api/fake-upload-service";
import { createMockNoticeAdapter } from "@/entities/notice/api/mock-notices";
import type { AppServices } from "@/app/providers/services";
import type { Repositories } from "@/shared/api/repositories";
import { createFixedClock } from "@/shared/lib/clock";
import { parseIsoUtc } from "@/shared/lib/datetime";

/**
 * 실제 route 트리를 memory router로 띄운다.
 *
 * guard와 셸 분리를 화면 조립까지 포함해 확인하기 위한 것이다. 개별 페이지만
 * 렌더링하면 guard를 건너뛰게 되어 정작 확인하려는 경계가 빠진다.
 */
export const TEST_NOW = parseIsoUtc("2026-06-08T03:00:00.000Z");

interface RenderRouteOptions {
  /** null이면 로그아웃 상태로 시작한다. */
  role?: Role | null;
  repositories?: Repositories;
  services?: Partial<AppServices>;
}

export function renderRoute(
  initialPath: string,
  { role = null, repositories, services }: RenderRouteOptions = {},
) {
  // mock 인증은 sessionStorage에 역할을 남긴다. 테스트끼리 새지 않게 지운다.
  sessionStorage.clear();

  const authAdapter = createMockAuthAdapter({ initialRole: role });
  const router = createMemoryRouter(routeTree, { initialEntries: [initialPath] });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const clock = createFixedClock(TEST_NOW);
  const resolvedRepositories =
    repositories ??
    createMockRepositories({
      clock,
      // 실제 서버처럼 로그인한 역할로 조회 범위와 권한을 판단한다.
      session: () => authAdapter.peekUser(),
      heartbeats: createMemoryHeartbeatLog(),
    });
  const resolvedServices: AppServices = {
    // 업로드는 즉시 끝난다. 진행률 애니메이션을 기다리지 않는다.
    assetUpload: createFakeUploadService({ tickMs: 0, tickCount: 2 }),
    notices: createMockNoticeAdapter({
      clock,
      isNoticeInUse: isMockRepositories(resolvedRepositories)
        ? resolvedRepositories.isNoticeInUse
        : undefined,
    }),
    ...services,
  };

  const result = render(
    <AppProviders
      services={resolvedServices}
      repositories={resolvedRepositories}
      authAdapter={authAdapter}
      queryClient={queryClient}
    >
      <RouterProvider router={router} />
    </AppProviders>,
  );

  return { ...result, router, authAdapter };
}

/** 현재 주소를 `pathname + search` 형태로 읽는다. */
export function currentPath(router: ReturnType<typeof createMemoryRouter>) {
  const { pathname, search } = router.state.location;
  return `${pathname}${search}`;
}
