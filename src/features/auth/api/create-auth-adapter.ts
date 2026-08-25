import type { AppEnv } from "@/shared/config/env";
import type { AuthAdapter } from "./auth-adapter";
import { createMockAuthAdapter } from "./mock-auth";

/**
 * 환경에 맞는 인증 구현을 고른다.
 *
 * 실제 연동은 인증 방식이 확정된 뒤 Phase 07에서 붙인다. 확정 전까지 운영
 * endpoint를 추측해 고정하지 않는다. production에서 mock이 켜지는 일은
 * `readAppEnv()`가 시작 시점에 막는다.
 */
export function createAuthAdapter(env: AppEnv): AuthAdapter {
  if (env.useMockAuth) return createMockAuthAdapter();

  throw new Error(
    "실제 인증 adapter가 아직 연결되지 않았습니다. Ziggle 인증 방식 확정 후 구현합니다.",
  );
}
