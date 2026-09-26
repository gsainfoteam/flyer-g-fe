import type { ZiggleNoticeAdapter } from "@/entities/notice/api/notice-adapter";
import type { AssetUploadService } from "@/features/media-upload/api/asset-upload-service";

/**
 * repository 바깥의 외부 경계.
 *
 * 사이니지 API(`Repositories`)와 달리 업로드와 Ziggle 공지 조회는 서로 다른 시스템일
 * 수 있다(명세 15장 14·16번). 계약이 확정될 때 각각 따로 교체할 수 있게 나눠 두고,
 * 각자 쓰는 계층의 context로 넘긴다.
 */
export interface AppServices {
  assetUpload: AssetUploadService;
  notices: ZiggleNoticeAdapter;
}
