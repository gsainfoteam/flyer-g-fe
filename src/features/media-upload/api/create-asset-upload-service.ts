import type { HttpClient } from "@/shared/api/http-client";
import { isMockUnit } from "@/shared/config/env";
import type { AppEnv } from "@/shared/config/env";
import type { AssetUploadService } from "./asset-upload-service";
import { createFakeUploadService } from "./fake-upload-service";
import type { FakeUploadOptions } from "./fake-upload-service";
import { createHttpUploadService } from "./http-upload-service";

/**
 * 환경에 맞는 업로드 구현을 고른다. (`VITE_API_MODE_UPLOAD`)
 *
 * 실제 업로드는 사용자 토큰을 싣는 API client가 필요하다. mock이면 쓰지 않는다.
 */
export function createAssetUploadService(
  env: AppEnv,
  client: HttpClient | null,
  options: FakeUploadOptions = {},
): AssetUploadService {
  if (isMockUnit(env, "upload")) {
    return createFakeUploadService(options);
  }
  if (client === null) {
    throw new Error("실제 업로드에는 API 주소가 필요합니다.");
  }
  return createHttpUploadService({ client });
}
