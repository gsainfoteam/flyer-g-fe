import {
  ALLOWED_VIDEO_MIME_TYPES,
  VIDEO_CONSTRAINTS,
} from "@/entities/media/model/types";
import type { AllowedVideoMimeType } from "@/entities/media/model/types";
import { SIGNATURE_PROBE_BYTES, formatMegabytes } from "./validate-image";

/**
 * 업로드 전 영상 검증 (배포 ①).
 *
 * 이미지처럼 MIME과 파일 앞부분 시그니처를 본다. 길이와 크기는 브라우저가 읽을 수
 * 있을 때만 잰다. HEVC·ProRes처럼 브라우저가 못 여는 영상도 서버는 변환해 받으므로,
 * 못 읽었다고 막지 않고 서버 검사(길이·해상도·코덱)에 맡긴다.
 */
export type VideoValidationCode =
  | "UNSUPPORTED_TYPE"
  | "SIGNATURE_MISMATCH"
  | "TOO_LARGE"
  | "TOO_LONG"
  | "EMPTY_FILE";

export type VideoValidationResult =
  | {
      ok: true;
      mimeType: AllowedVideoMimeType;
      /** 브라우저가 읽지 못했으면 0 */
      width: number;
      height: number;
      /** 브라우저가 읽지 못했으면 null */
      durationMs: number | null;
      sizeBytes: number;
    }
  | { ok: false; code: VideoValidationCode; message: string };

export interface VideoMetadata {
  width: number;
  height: number;
  durationMs: number;
}

/** 영상의 크기와 길이를 읽는다. 읽지 못하면 null. jsdom에서는 바꿔 넣는다. */
export type VideoProbe = (file: File) => Promise<VideoMetadata | null>;

const PROBE_TIMEOUT_MS = 10_000;

export const probeVideoWithBrowser: VideoProbe = (file) =>
  new Promise((resolve) => {
    if (typeof document === "undefined") {
      resolve(null);
      return;
    }
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    const done = (result: VideoMetadata | null) => {
      window.clearTimeout(timer);
      video.removeAttribute("src");
      video.load();
      URL.revokeObjectURL(url);
      resolve(result);
    };
    const timer = window.setTimeout(() => done(null), PROBE_TIMEOUT_MS);
    video.preload = "metadata";
    video.muted = true;
    video.onloadedmetadata = () =>
      done(
        Number.isFinite(video.duration)
          ? {
              width: video.videoWidth,
              height: video.videoHeight,
              durationMs: Math.round(video.duration * 1000),
            }
          : null,
      );
    video.onerror = () => done(null);
    video.src = url;
  });

export function isAllowedVideoMimeType(
  value: string,
): value is AllowedVideoMimeType {
  return (ALLOWED_VIDEO_MIME_TYPES as readonly string[]).includes(value);
}

/** MP4·MOV(ISO BMFF)의 첫 상자 이름. 오래된 MOV는 ftyp 없이 시작하기도 한다. */
const ISO_BMFF_BOXES = ["ftyp", "moov", "mdat", "wide", "free", "skip"];
const EBML = [0x1a, 0x45, 0xdf, 0xa3];

export function matchesVideoSignature(
  head: Uint8Array,
  mimeType: AllowedVideoMimeType,
): boolean {
  if (mimeType === "video/webm") {
    return EBML.every((byte, index) => head[index] === byte);
  }
  const box = String.fromCharCode(...head.slice(4, 8));
  return ISO_BMFF_BOXES.includes(box);
}

export interface ValidateVideoFileOptions {
  probe?: VideoProbe;
  maxSizeBytes?: number;
  maxDurationSeconds?: number;
}

export async function validateVideoFile(
  file: File,
  options: ValidateVideoFileOptions = {},
): Promise<VideoValidationResult> {
  const maxSizeBytes = options.maxSizeBytes ?? VIDEO_CONSTRAINTS.maxSizeBytes;
  const maxDurationSeconds =
    options.maxDurationSeconds ?? VIDEO_CONSTRAINTS.maxDurationSeconds;
  const probe = options.probe ?? probeVideoWithBrowser;

  if (file.size === 0) {
    return {
      ok: false,
      code: "EMPTY_FILE",
      message: "빈 파일입니다. 다른 영상을 선택해 주세요.",
    };
  }
  if (file.size > maxSizeBytes) {
    const limitMb = Math.floor(maxSizeBytes / (1024 * 1024));
    return {
      ok: false,
      code: "TOO_LARGE",
      message: `영상은 ${limitMb}MB까지 올릴 수 있어요. 이 파일은 ${formatMegabytes(file.size)}입니다.`,
    };
  }
  if (!isAllowedVideoMimeType(file.type)) {
    return {
      ok: false,
      code: "UNSUPPORTED_TYPE",
      message: "MP4, MOV, WebM 영상만 올릴 수 있어요.",
    };
  }

  const head = new Uint8Array(
    await file.slice(0, SIGNATURE_PROBE_BYTES).arrayBuffer(),
  );
  if (!matchesVideoSignature(head, file.type)) {
    return {
      ok: false,
      code: "SIGNATURE_MISMATCH",
      message:
        "파일 내용이 영상 형식과 맞지 않아요. 원본 영상을 다시 내보내 주세요.",
    };
  }

  const metadata = await probe(file);
  if (metadata && metadata.durationMs > maxDurationSeconds * 1000) {
    return {
      ok: false,
      code: "TOO_LONG",
      message: `영상은 ${maxDurationSeconds}초까지 올릴 수 있어요. 이 영상은 ${Math.ceil(metadata.durationMs / 1000)}초입니다.`,
    };
  }

  return {
    ok: true,
    mimeType: file.type,
    width: metadata?.width ?? 0,
    height: metadata?.height ?? 0,
    durationMs: metadata?.durationMs ?? null,
    sizeBytes: file.size,
  };
}
