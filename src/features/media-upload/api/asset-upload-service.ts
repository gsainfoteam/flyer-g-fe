/**
 * 포스터 업로드 경계 (명세 FR-SUB-01).
 *
 * 서버 업로드 계약이 아직 없다(presign 방식인지 서버 경유 multipart인지 미결정,
 * 명세 15장 16번). 화면은 이 인터페이스만 알고, 계약이 확정되면 구현체만 바꾼다.
 * 요구사항은 `API-REQUIREMENTS.md` 4절에 적어 두었다.
 */
export interface UploadedAsset {
  /** 신청 생성 시 `assetId`로 보낸다. */
  assetId: string;
  /** 업로드된 이미지를 볼 수 있는 URL. */
  url: string;
  width: number;
  height: number;
  mimeType: string;
  sizeBytes: number;
}

export interface UploadOptions {
  /** 0~1. 진행률 표시용이며 정확도를 보장하지 않는다. */
  onProgress?: (ratio: number) => void;
  signal?: AbortSignal;
}

export interface AssetUploadService {
  upload(file: File, options?: UploadOptions): Promise<UploadedAsset>;
}
