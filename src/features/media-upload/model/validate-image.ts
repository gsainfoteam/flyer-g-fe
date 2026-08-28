import {
  ALLOWED_IMAGE_MIME_TYPES,
  MEDIA_CONSTRAINTS,
} from "@/entities/media/model/types";
import type { AllowedImageMimeType } from "@/entities/media/model/types";

/**
 * 업로드 전 이미지 검증 (명세 FR-SUB-01).
 *
 * 세 겹으로 본다. 파일이 주장하는 MIME, 파일 앞부분의 실제 시그니처, 그리고
 * 브라우저가 정말 그릴 수 있는지. MIME만 믿으면 확장자를 바꾼 SVG나 실행 파일이
 * 통과한다. 서버도 같은 검증을 다시 해야 하며(명세 9.4) 여기서 막는 것은 사용자가
 * 10MB를 올린 뒤에 거절당하지 않게 하려는 것이다.
 */
export type ImageValidationCode =
  | "UNSUPPORTED_TYPE"
  | "SIGNATURE_MISMATCH"
  | "TOO_LARGE"
  | "EMPTY_FILE"
  | "DECODE_FAILED"
  | "TOO_SMALL";

export interface ImageValidationFailure {
  ok: false;
  code: ImageValidationCode;
  message: string;
}

export interface ImageValidationSuccess {
  ok: true;
  mimeType: AllowedImageMimeType;
  width: number;
  height: number;
  sizeBytes: number;
}

export type ImageValidationResult =
  | ImageValidationSuccess
  | ImageValidationFailure;

function fail(
  code: ImageValidationCode,
  message: string,
): ImageValidationFailure {
  return { ok: false, code, message };
}

/**
 * 파일 앞부분의 magic number.
 *
 * WebP는 `RIFF....WEBP`라 8바이트를 건너뛴 위치를 함께 본다.
 */
const SIGNATURES: Record<
  AllowedImageMimeType,
  { offset: number; bytes: number[] }[]
> = {
  "image/jpeg": [{ offset: 0, bytes: [0xff, 0xd8, 0xff] }],
  "image/png": [
    { offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  ],
  "image/webp": [
    { offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] },
    { offset: 8, bytes: [0x57, 0x45, 0x42, 0x50] },
  ],
};

/** 시그니처 판정에 필요한 만큼만 읽는다. 10MB를 통째로 메모리에 올리지 않는다. */
export const SIGNATURE_PROBE_BYTES = 16;

export function isAllowedImageMimeType(
  value: string,
): value is AllowedImageMimeType {
  return (ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(value);
}

/** 앞부분 바이트가 해당 형식의 시그니처와 맞는지 본다. */
export function matchesSignature(
  head: Uint8Array,
  mimeType: AllowedImageMimeType,
): boolean {
  return SIGNATURES[mimeType].every(({ offset, bytes }) =>
    bytes.every((byte, index) => head[offset + index] === byte),
  );
}

/** 실제로 어떤 형식인지 돌려준다. 확장자를 바꾼 파일을 잡는 데 쓴다. */
export function detectImageMimeType(
  head: Uint8Array,
): AllowedImageMimeType | null {
  for (const mimeType of ALLOWED_IMAGE_MIME_TYPES) {
    if (matchesSignature(head, mimeType)) return mimeType;
  }
  return null;
}

export interface ImageDimensions {
  width: number;
  height: number;
}

/**
 * 브라우저가 실제로 그릴 수 있는지 확인하고 크기를 잰다.
 *
 * 테스트와 jsdom에서는 decode가 불가능하므로 주입할 수 있게 열어 둔다.
 */
export type ImageDecoder = (file: File) => Promise<ImageDimensions>;

export const decodeImageWithBrowser: ImageDecoder = async (file) => {
  const bitmap = await createImageBitmap(file);
  try {
    return { width: bitmap.width, height: bitmap.height };
  } finally {
    bitmap.close();
  }
};

export interface ValidateImageFileOptions {
  decode?: ImageDecoder;
  maxSizeBytes?: number;
  minShortEdgePx?: number;
}

/**
 * 짧은 변이 기준보다 작으면 통과시키지 않는다.
 *
 * 1080px 미만은 TV에서 눈에 띄게 뭉개진다. 경고로 두면 그대로 올라가고 승인
 * 단계에서야 문제가 드러나므로, 명세 FR-SUB-01 인수 조건대로 업로드 전에 막는다.
 */
export async function validateImageFile(
  file: File,
  options: ValidateImageFileOptions = {},
): Promise<ImageValidationResult> {
  const maxSizeBytes = options.maxSizeBytes ?? MEDIA_CONSTRAINTS.maxSizeBytes;
  const minShortEdgePx =
    options.minShortEdgePx ?? MEDIA_CONSTRAINTS.minShortEdgePx;
  const decode = options.decode ?? decodeImageWithBrowser;

  if (file.size === 0) {
    return fail("EMPTY_FILE", "빈 파일입니다. 다른 이미지를 선택해 주세요.");
  }

  if (file.size > maxSizeBytes) {
    const limitMb = Math.floor(maxSizeBytes / (1024 * 1024));
    return fail(
      "TOO_LARGE",
      `${limitMb}MB까지 올릴 수 있어요. 이 파일은 ${formatMegabytes(file.size)}입니다.`,
    );
  }

  if (!isAllowedImageMimeType(file.type)) {
    return fail(
      "UNSUPPORTED_TYPE",
      "JPG, PNG, WebP 이미지만 올릴 수 있어요.",
    );
  }

  const head = new Uint8Array(
    await file.slice(0, SIGNATURE_PROBE_BYTES).arrayBuffer(),
  );
  const detected = detectImageMimeType(head);
  if (detected === null || detected !== file.type) {
    return fail(
      "SIGNATURE_MISMATCH",
      "파일 내용이 이미지 형식과 맞지 않아요. 원본 이미지를 다시 내보내 주세요.",
    );
  }

  let dimensions: ImageDimensions;
  try {
    dimensions = await decode(file);
  } catch {
    return fail(
      "DECODE_FAILED",
      "이미지를 열 수 없어요. 파일이 손상되었을 수 있습니다.",
    );
  }

  const shortEdge = Math.min(dimensions.width, dimensions.height);
  if (shortEdge < minShortEdgePx) {
    return fail(
      "TOO_SMALL",
      `짧은 변이 ${minShortEdgePx}px 이상이어야 해요. 이 이미지는 ${dimensions.width}×${dimensions.height}입니다.`,
    );
  }

  return {
    ok: true,
    mimeType: file.type,
    width: dimensions.width,
    height: dimensions.height,
    sizeBytes: file.size,
  };
}

export function formatMegabytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
