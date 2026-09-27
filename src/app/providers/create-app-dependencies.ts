import { createAuthAdapter } from "@/features/auth/api/create-auth-adapter";
import type { AuthAdapter } from "@/features/auth/api/auth-adapter";
import { isMockAuthAdapter } from "@/features/auth/api/mock-auth";
import { createAssetUploadService } from "@/features/media-upload/api/create-asset-upload-service";
import { createNoticeAdapter } from "@/entities/notice/api/create-notice-adapter";
import {
  createMockRepositories,
  isMockRepositories,
} from "@/mocks/repositories";
import type { Repositories } from "@/shared/api/repositories";
import { isMockUnit } from "@/shared/config/env";
import type { ApiUnit, AppEnv } from "@/shared/config/env";
import type { AppServices } from "./services";

/**
 * 앱이 쓰는 바깥 경계(인증, 데이터, 업로드, 공지)를 환경에 맞게 한 번에 만든다.
 *
 * 렌더 중이 아니라 시작 시점(`main.tsx`)에 만든다. 설정이 잘못되어 만들 수 없으면
 * 화면을 그리기 전에 알 수 있고, 흰 화면 대신 설정 오류 화면을 보여줄 수 있다.
 */
export interface AppDependencies {
  authAdapter: AuthAdapter;
  repositories: Repositories;
  services: AppServices;
}

export function createAppDependencies(env: AppEnv): AppDependencies {
  const authAdapter = createAuthAdapter(env);
  const repositories = createRepositories(env, authAdapter);
  const services: AppServices = {
    assetUpload: createAssetUploadService(env),
    notices: createNoticeAdapter(env, {
      latencyMs: 200,
      // mock끼리 이어서 이미 신청한 공지를 실제 서버처럼 막는다.
      isNoticeInUse: isMockRepositories(repositories)
        ? repositories.isNoticeInUse
        : undefined,
    }),
  };
  return { authAdapter, repositories, services };
}

/** repository 하나를 어느 연동 단위가 정하는가 */
const REPOSITORY_UNITS = {
  submissions: "submissions",
  reviews: "reviews",
  displays: "display",
  devices: "devices",
} as const satisfies Record<keyof Repositories, ApiUnit>;

/**
 * 사이니지 API 구현을 단위별로 고른다. (Phase 08 부분 연동)
 *
 * 실제 HTTP 구현은 단위마다 연동하면서 붙인다. 아직 없는 단위를 real로 두면
 * 시작 시점에 어느 단위인지 알린다.
 */
function createRepositories(
  env: AppEnv,
  authAdapter: AuthAdapter,
): Repositories {
  const pending = (
    Object.keys(REPOSITORY_UNITS) as (keyof Repositories)[]
  ).filter((key) => !isMockUnit(env, REPOSITORY_UNITS[key]));
  if (pending.length > 0) {
    throw new Error(
      `실제 API repository가 아직 연결되지 않았습니다: ${pending.join(", ")}. 해당 VITE_API_MODE_*를 mock으로 두세요.`,
    );
  }

  return createMockRepositories({
    latencyMs: 200,
    // mock 서버가 "누가 요청했는지" 알게 한다. 실제 서버는 Bearer 토큰으로 안다.
    session: isMockAuthAdapter(authAdapter)
      ? () => authAdapter.peekUser()
      : undefined,
  });
}
