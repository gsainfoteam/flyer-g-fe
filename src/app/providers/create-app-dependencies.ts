import { createAuthAdapter } from "@/features/auth/api/create-auth-adapter";
import type { AuthAdapter } from "@/features/auth/api/auth-adapter";
import { isHttpAuthAdapter } from "@/features/auth/api/http-auth-adapter";
import { isMockAuthAdapter } from "@/features/auth/api/mock-auth";
import { createHttpReferenceRepository } from "@/entities/submission/api/http-reference-repository";
import { createHttpSubmissionRepository } from "@/entities/submission/api/http-submission-repository";
import { createAssetUploadService } from "@/features/media-upload/api/create-asset-upload-service";
import { createMockRepositories } from "@/mocks/repositories";
import { createHttpClient } from "@/shared/api/http-client";
import type { HttpClient } from "@/shared/api/http-client";
import type { Repositories } from "@/shared/api/repositories";
import { isMockUnit } from "@/shared/config/env";
import type { ApiUnit, AppEnv } from "@/shared/config/env";
import type { AppServices } from "./services";

/**
 * 앱이 쓰는 바깥 경계(인증, 데이터, 업로드)를 환경에 맞게 한 번에 만든다.
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
  const apiClient = createApiClient(env, authAdapter);
  const repositories = createRepositories(env, authAdapter, apiClient);
  const services: AppServices = {
    assetUpload: createAssetUploadService(env, apiClient),
  };
  return { authAdapter, repositories, services };
}

/**
 * 실제 API를 부르는 client. 로그인했으면 요청마다 Bearer 토큰을 싣고, 401이면 한 번
 * 갱신해 다시 보낸다. API 주소가 없으면(전부 mock) 만들지 않는다.
 */
function createApiClient(
  env: AppEnv,
  authAdapter: AuthAdapter,
): HttpClient | null {
  if (env.apiBaseUrl === null) return null;
  return createHttpClient({
    baseUrl: env.apiBaseUrl,
    ...(isHttpAuthAdapter(authAdapter)
      ? {
          getAuthHeaders: authAdapter.getAuthHeaders,
          onUnauthorized: authAdapter.refreshSession,
        }
      : {}),
  });
}

/** repository 하나를 어느 연동 단위가 정하는가 */
const REPOSITORY_UNITS = {
  submissions: "submissions",
  reviews: "reviews",
  displays: "display",
  devices: "devices",
  reference: "reference",
} as const satisfies Record<keyof Repositories, ApiUnit>;

/**
 * 사이니지 API 구현을 단위별로 고른다. (Phase 08 부분 연동)
 *
 * 연결을 마친 단위는 실제 구현을, 나머지는 mock을 쓴다. 아직 실제 구현이 없는
 * 단위를 real로 두면 시작 시점에 어느 단위인지 알린다.
 */
function createRepositories(
  env: AppEnv,
  authAdapter: AuthAdapter,
  apiClient: HttpClient | null,
): Repositories {
  const mock = createMockRepositories({
    latencyMs: 200,
    // mock 서버가 "누가 요청했는지" 알게 한다. 실제 서버는 Bearer 토큰으로 안다.
    session: isMockAuthAdapter(authAdapter)
      ? () => authAdapter.peekUser()
      : undefined,
  });
  const real: Partial<{ [K in keyof Repositories]: () => Repositories[K] }> =
    apiClient === null
      ? {}
      : {
          reference: () => createHttpReferenceRepository(apiClient),
          submissions: () => createHttpSubmissionRepository(apiClient),
        };

  const pending = (
    Object.keys(REPOSITORY_UNITS) as (keyof Repositories)[]
  ).filter((key) => !isMockUnit(env, REPOSITORY_UNITS[key]) && !real[key]);
  if (pending.length > 0) {
    throw new Error(
      `실제 API repository가 아직 연결되지 않았습니다: ${pending.join(", ")}. 해당 VITE_API_MODE_*를 mock으로 두세요.`,
    );
  }

  const pick = <K extends keyof Repositories>(key: K): Repositories[K] =>
    isMockUnit(env, REPOSITORY_UNITS[key]) ? mock[key] : real[key]!();

  return {
    submissions: pick("submissions"),
    reviews: pick("reviews"),
    displays: pick("displays"),
    devices: pick("devices"),
    reference: pick("reference"),
  };
}
