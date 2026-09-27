import { isMockUnit } from "@/shared/config/env";
import type { AppEnv } from "@/shared/config/env";
import type { ZiggleNoticeAdapter } from "@/entities/notice/api/notice-adapter";
import { createMockNoticeAdapter } from "@/entities/notice/api/mock-notices";
import type { MockNoticeOptions } from "@/entities/notice/api/mock-notices";

/**
 * 환경에 맞는 공지 adapter를 고른다.
 *
 * 백엔드에 Ziggle 공지 조회 API가 없다(`API-CHANGES-BACKEND.md` 3절). 신청 단위를
 * 실제 서버로 옮기면 신청 폼이 수동 입력으로 바뀌면서 이 adapter는 쓰이지 않는다.
 * 그때까지는 신청 단위의 mock 여부를 따른다.
 */
export function createNoticeAdapter(
  env: AppEnv,
  options: MockNoticeOptions = {},
): ZiggleNoticeAdapter {
  if (isMockUnit(env, "submissions")) {
    return createMockNoticeAdapter(options);
  }

  throw new Error(
    "실제 Ziggle 공지 조회가 아직 연결되지 않았습니다. API 계약 확정 후 Phase 08에서 구현합니다.",
  );
}
