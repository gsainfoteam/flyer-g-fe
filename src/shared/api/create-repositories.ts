import { createMockRepositories } from "@/mocks/repositories";
import type { AppEnv } from "@/shared/config/env";
import type { Clock } from "@/shared/lib/clock";
import type { Repositories } from "./repositories";

/**
 * 환경에 맞는 repository 구현을 고른다.
 *
 * 실제 HTTP 구현은 Ziggle/사이니지 OpenAPI 계약이 확정된 뒤 Phase 08에서 붙인다.
 * 계약이 없는 상태에서 운영 endpoint를 추측해 고정하지 않는다.
 */
export function createRepositories(
  env: AppEnv,
  options: { clock?: Clock; latencyMs?: number } = {},
): Repositories {
  if (env.useMockApi) {
    return createMockRepositories(options);
  }

  throw new Error(
    "실제 API repository가 아직 연결되지 않았습니다. API 계약 확정 후 Phase 08에서 구현합니다.",
  );
}
