import { createContext, useContext } from "react";
import type { AssetUploadService } from "./asset-upload-service";

/**
 * 포스터 업로드 경계를 화면에 넘긴다. 앱은 `AppProviders`가, 테스트는 즉시 끝나는
 * 가짜 업로드를 넣는다.
 */
export const AssetUploadContext = createContext<AssetUploadService | null>(null);

export function useAssetUploadService(): AssetUploadService {
  const value = useContext(AssetUploadContext);
  if (value === null) {
    throw new Error("useAssetUploadService는 AppProviders 안에서만 쓸 수 있습니다.");
  }
  return value;
}
