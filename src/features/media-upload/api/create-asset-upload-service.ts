import { isMockUnit } from "@/shared/config/env";
import type { AppEnv } from "@/shared/config/env";
import type { AssetUploadService } from "./asset-upload-service";
import { createFakeUploadService } from "./fake-upload-service";
import type { FakeUploadOptions } from "./fake-upload-service";

/**
 * 환경에 맞는 업로드 구현을 고른다.
 *
 * 실제 업로드는 presign 계약이 확정된 뒤 Phase 08에서 붙인다. 계약이 없는 상태에서
 * 운영 endpoint를 추측해 고정하지 않는다. (`API-REQUIREMENTS.md` 2절)
 */
export function createAssetUploadService(
  env: AppEnv,
  options: FakeUploadOptions = {},
): AssetUploadService {
  if (isMockUnit(env, "upload")) {
    return createFakeUploadService(options);
  }

  throw new Error(
    "실제 업로드 서비스가 아직 연결되지 않았습니다. presign 계약 확정 후 Phase 08에서 구현합니다.",
  );
}
