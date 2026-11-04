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
} as const;

/**
 * 영상 포스터 형식(배포 ①). 서버가 TV 재생용 mp4로 바꾼다. 실제로 받는지는 운영 설정의
 * `allowedMimeTypes`가 정한다. 영상을 아직 열지 않은 환경이면 거기에 없다.
 */
export const ALLOWED_VIDEO_MIME_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
] as const;
export type AllowedVideoMimeType = (typeof ALLOWED_VIDEO_MIME_TYPES)[number];

/** 영상 한도 기본값. 서버 설정(`maxVideoUploadBytes`·`maxVideoDurationSeconds`)이 덮어쓴다. */
export const VIDEO_CONSTRAINTS = {
  maxSizeBytes: 100 * 1024 * 1024,
  maxDurationSeconds: 30,
} as const;
