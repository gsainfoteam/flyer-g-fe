import type { AppEnv } from "@/shared/config/env";
import type { ZiggleNoticeAdapter } from "@/entities/notice/api/notice-adapter";
import { createMockNoticeAdapter } from "@/entities/notice/api/mock-notices";
import type { MockNoticeOptions } from "@/entities/notice/api/mock-notices";

/**
 * 환경에 맞는 공지 adapter를 고른다.
 *
 * 실제 Ziggle 공지 조회는 계약 확정 후 Phase 08에서 붙인다.
 * (`API-REQUIREMENTS.md` 1절)
 */
export function createNoticeAdapter(
  env: AppEnv,
  options: MockNoticeOptions = {},
): ZiggleNoticeAdapter {
  if (env.useMockApi) {
    return createMockNoticeAdapter(options);
  }

  throw new Error(
    "실제 Ziggle 공지 조회가 아직 연결되지 않았습니다. API 계약 확정 후 Phase 08에서 구현합니다.",
  );
}
