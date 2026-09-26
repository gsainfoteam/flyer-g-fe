import { createAuthAdapter } from "@/features/auth/api/create-auth-adapter";
import type { AuthAdapter } from "@/features/auth/api/auth-adapter";
import { isMockAuthAdapter } from "@/features/auth/api/mock-auth";
import { createAssetUploadService } from "@/features/media-upload/api/create-asset-upload-service";
import { createNoticeAdapter } from "@/features/ziggle-notice/api/create-notice-adapter";
import { isMockRepositories } from "@/mocks/repositories";
import { createRepositories } from "@/shared/api/create-repositories";
import type { Repositories } from "@/shared/api/repositories";
import type { AppEnv } from "@/shared/config/env";
import type { AppServices } from "./services-context";

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
  const repositories = createRepositories(env, {
    latencyMs: 200,
    // mock 서버가 "누가 요청했는지" 알게 한다. 실제 서버는 쿠키로 안다.
    session: isMockAuthAdapter(authAdapter)
      ? () => authAdapter.peekUser()
      : undefined,
  });
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
