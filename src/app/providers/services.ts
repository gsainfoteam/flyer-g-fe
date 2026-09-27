import type { AssetUploadService } from "@/features/media-upload/api/asset-upload-service";

/**
 * repository 바깥의 외부 경계.
 *
 * 업로드는 저장소(S3)에 직접 올리는 단계가 있어 사이니지 API(`Repositories`)와
 * 따로 둔다. 쓰는 계층의 context로 넘긴다.
 *
 * Ziggle 공지 조회는 백엔드에 API가 없어 두지 않는다. 신청 폼은 수동 입력이다.
 * (`API-CHANGES-BACKEND.md` 3절)
 */
export interface AppServices {
  assetUpload: AssetUploadService;
}
