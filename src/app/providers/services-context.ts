import { createContext, useContext } from "react";
import type { AssetUploadService } from "@/features/media-upload/api/asset-upload-service";
import type { ZiggleNoticeAdapter } from "@/features/ziggle-notice/api/notice-adapter";

/**
 * repository 바깥의 외부 경계.
 *
 * 사이니지 API(`Repositories`)와 달리 업로드와 Ziggle 공지 조회는 서로 다른 시스템일
 * 수 있다(명세 15장 14·16번). 계약이 확정될 때 각각 따로 교체할 수 있게 나눠 둔다.
 */
export interface AppServices {
  assetUpload: AssetUploadService;
  notices: ZiggleNoticeAdapter;
}

export const ServicesContext = createContext<AppServices | null>(null);

export function useAppServices(): AppServices {
  const value = useContext(ServicesContext);
  if (value === null) {
    throw new Error("useAppServices는 AppProviders 안에서만 쓸 수 있습니다.");
  }
  return value;
}
