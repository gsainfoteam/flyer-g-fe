/** 명세 6.4 MediaAsset */
export const MEDIA_MODERATION_STATUSES = [
  "PENDING",
  "APPROVED",
  "REJECTED",
] as const;
export type MediaModerationStatus =
  (typeof MEDIA_MODERATION_STATUSES)[number];

/** 명세 FR-SUB-01 허용 형식. SVG와 실행 가능한 형식은 받지 않는다. */
export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
export type AllowedImageMimeType =
  (typeof ALLOWED_IMAGE_MIME_TYPES)[number];

/** 명세 FR-SUB-01 업로드 제한 제안값. 확정되면 서버 설정에서 받아 덮어쓴다. */
export const MEDIA_CONSTRAINTS = {
  maxSizeBytes: 10 * 1024 * 1024,
  minShortEdgePx: 1080,
} as const;

export interface MediaAssetDto {
  id: string;
  /** 객체 저장소 키. 공개 원본 URL을 그대로 저장하지 않는다. */
  storageKey: string;
  mimeType: string;
  width: number;
  height: number;
  sizeBytes: number;
  checksum: string;
  moderationStatus: MediaModerationStatus;
  /** 화면 크기에 맞춘 파생본. key는 variant 이름. */
  variants: Record<string, string>;
}
