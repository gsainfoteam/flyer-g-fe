import type { AppEnv } from "@/shared/config/env";
import type { AuthAdapter } from "./auth-adapter";
import { createHttpAuthAdapter } from "./http-auth-adapter";
import { createMockAuthAdapter } from "./mock-auth";

/**
 * 환경에 맞는 인증 구현을 고른다.
 *
 * production에서 mock이 켜지는 일과 실제 로그인 설정이 빠진 일은 `readAppEnv()`가
 * 시작 시점에 막는다.
 */
export function createAuthAdapter(env: AppEnv): AuthAdapter {
  if (env.useMockAuth) return createMockAuthAdapter();

  if (env.auth === null || env.apiBaseUrl === null) {
    throw new Error("실제 로그인에는 API 주소와 로그인 설정이 필요합니다.");
  }
  return createHttpAuthAdapter({
    apiBaseUrl: env.apiBaseUrl,
    clientId: env.auth.clientId,
    redirectUri: env.auth.redirectUri,
  });
}
