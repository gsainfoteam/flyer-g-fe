import { ApiError } from "@/shared/api/error";
import type { ApiRequestBody } from "@/shared/api/contract";
import type { HttpClient } from "@/shared/api/http-client";
import {
  readNullableNumber,
  readNullableString,
  readNumber,
  readObject,
  readString,
} from "@/shared/api/parse";
import type {
  AssetUploadService,
  UploadOptions,
  UploadedAsset,
} from "./asset-upload-service";

/**
 * 실제 포스터 업로드 (`API-CHANGES-BACKEND.md` 4절, presign 방식).
 *
 * 1. `POST /signage/assets/presign`: 파일 형식·크기·checksum을 알리고 서명 URL을 받는다.
 * 2. 서명 URL(S3)로 파일을 직접 PUT한다. 진행률과 취소를 위해 XHR을 쓴다.
 *    서명에 Content-Type과 크기가 들어 있어, 알린 값과 다르면 S3가 403으로 거절한다.
 * 3. `POST /signage/assets/{assetId}/complete`: 서버가 검사·변환(EXIF 제거, webp)을
 *    마치고 미리보기 URL을 준다. 이미지를 처리하느라 오래 걸릴 수 있다. 영상은 변환이
 *    끝날 때까지 202 `PROCESSING`을 주므로 `retryAfterSeconds` 뒤 다시 부른다(배포 ①).
 *
 * 거절된 asset은 다시 쓸 수 없다. 재시도는 presign부터 새로 한다.
 */

/** presign 응답의 서명 URL로 파일을 보내는 방법. 테스트에서 바꾼다. */
export interface UploadTransport {
  put(
    url: string,
    file: Blob,
    headers: Record<string, string>,
    options: { onProgress: (ratio: number) => void; signal?: AbortSignal },
  ): Promise<void>;
}

export interface HttpUploadServiceOptions {
  client: HttpClient;
  transport?: UploadTransport;
  /** 파일 내용의 sha256(소문자 hex). 테스트에서 바꾼다. */
  digest?: (file: Blob) => Promise<string>;
  /** 영상 변환을 기다리는 방법과 시계. 테스트에서 바꾼다. */
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
  now?: () => number;
}

/** 서버가 이미지를 검사·변환하는 동안 기다리는 시간 */
const COMPLETE_TIMEOUT_MS = 60_000;
/** 진행률 중 파일 전송이 차지하는 몫. 나머지는 서버 처리다. */
const TRANSFER_SHARE = 0.9;
/** 영상 변환을 기다리는 최대 시간. 서버는 보통 수십 초, 일시 장애면 몇 분 안에 끝낸다. */
const PROCESSING_DEADLINE_MS = 10 * 60_000;
/** 서버가 알려 준 대기 시간을 이 범위로 둔다. */
const RETRY_AFTER_SECONDS = { min: 1, max: 30, fallback: 5 } as const;

/**
 * 서버가 받는 이미지·영상 형식. 생성된 계약 타입은 영상 배포(①) 전 문서라 영상이
 * 없다. `bun run api:sync` 뒤에는 `ApiRequestBody<"PresignAssetRequestDto">["mimeType"]`과
 * 같아진다.
 */
type UploadMimeType =
  | ApiRequestBody<"PresignAssetRequestDto">["mimeType"]
  | "video/mp4"
  | "video/quicktime"
  | "video/webm";

const UPLOAD_MIME_TYPES = {
  "image/jpeg": true,
  "image/png": true,
  "image/webp": true,
  "video/mp4": true,
  "video/quicktime": true,
  "video/webm": true,
} satisfies Record<UploadMimeType, true>;

function isUploadMimeType(value: string): value is UploadMimeType {
  return Object.hasOwn(UPLOAD_MIME_TYPES, value);
}

/** 브라우저가 정하는 헤더. 직접 넣으면 무시되거나 오류가 난다. */
const BROWSER_MANAGED_HEADERS = new Set(["content-length", "host"]);

function uploadFailed(status: number | null): ApiError {
  return new ApiError({
    kind: status === null ? "network" : "http",
    code: "UPLOAD_FAILED",
    message:
      status === null
        ? "업로드 중 연결이 끊겼습니다."
        : `저장소가 업로드를 거절했습니다 (${status})`,
    status,
  });
}

export const xhrUploadTransport: UploadTransport = {
  put(url, file, headers, { onProgress, signal }) {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(new DOMException("Aborted", "AbortError"));
        return;
      }
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", url);
      for (const [name, value] of Object.entries(headers)) {
        if (!BROWSER_MANAGED_HEADERS.has(name.toLowerCase())) {
          xhr.setRequestHeader(name, value);
        }
      }
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && event.total > 0) {
          onProgress(event.loaded / event.total);
        }
      };
      const onAbort = () => xhr.abort();
      signal?.addEventListener("abort", onAbort, { once: true });
      const settle = () => signal?.removeEventListener("abort", onAbort);

      xhr.onload = () => {
        settle();
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else reject(uploadFailed(xhr.status));
      };
      xhr.onerror = () => {
        settle();
        reject(uploadFailed(null));
      };
      xhr.onabort = () => {
        settle();
        reject(new DOMException("Aborted", "AbortError"));
      };
      xhr.send(file);
    });
  },
};

async function sha256Hex(file: Blob): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    await file.arrayBuffer(),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

interface Presigned {
  assetId: string;
  uploadUrl: string;
  headers: Record<string, string>;
}

export function parsePresigned(payload: unknown): Presigned {
  const body = readObject(payload);
  const rawHeaders = readObject(body.headers ?? {}, "headers");
  const headers = Object.fromEntries(
    Object.entries(rawHeaders).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
  return {
    assetId: readString(body, "assetId"),
    uploadUrl: readString(body, "uploadUrl"),
    headers,
  };
}

export function parseUploadedAsset(payload: unknown): UploadedAsset {
  const body = readObject(payload);
  return {
    assetId: readString(body, "assetId"),
    url: readString(body, "url"),
    width: readNumber(body, "width"),
    height: readNumber(body, "height"),
    mimeType: readString(body, "mimeType"),
    sizeBytes: readNumber(body, "sizeBytes"),
    // 영상 배포(①) 전 서버는 종류를 보내지 않는다. 그때는 모두 이미지다.
    kind: body.kind === "VIDEO" ? "VIDEO" : "IMAGE",
    videoUrl: readNullableString(body, "videoUrl") ?? null,
    durationMs: readNullableNumber(body, "durationMs") ?? null,
  };
}

/** complete가 202로 준 "변환 중"이면 다시 부를 때까지 기다릴 초. 아니면 null */
function processingRetryAfter(payload: unknown): number | null {
  if (
    typeof payload !== "object" ||
    payload === null ||
    (payload as { status?: unknown }).status !== "PROCESSING"
  ) {
    return null;
  }
  const seconds = (payload as { retryAfterSeconds?: unknown })
    .retryAfterSeconds;
  return typeof seconds === "number" && Number.isFinite(seconds)
    ? Math.min(
        RETRY_AFTER_SECONDS.max,
        Math.max(RETRY_AFTER_SECONDS.min, seconds),
      )
    : RETRY_AFTER_SECONDS.fallback;
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function processingTimedOut(): ApiError {
  return new ApiError({
    kind: "timeout",
    code: "UPLOAD_FAILED",
    message: "영상 변환이 오래 걸리고 있어요. 잠시 뒤 다시 시도해 주세요.",
  });
}

export function createHttpUploadService({
  client,
  transport = xhrUploadTransport,
  digest = sha256Hex,
  sleep = wait,
  now = Date.now,
}: HttpUploadServiceOptions): AssetUploadService {
  return {
    async upload(
      file: File,
      { onProgress, onProcessing, signal }: UploadOptions = {},
    ) {
      onProgress?.(0);
      // 폼이 먼저 막지만, 서버가 받지 않는 형식을 보내지 않는다.
      const mimeType = file.type;
      if (!isUploadMimeType(mimeType)) {
        throw new ApiError({
          kind: "unknown",
          code: "UPLOAD_FAILED",
          message: `지원하지 않는 파일 형식입니다: ${mimeType || "알 수 없음"}`,
        });
      }

      // 전송 중 손상을 서버가 잡을 수 있게 내용의 checksum을 함께 알린다.
      const checksum = `sha256:${await digest(file)}`;
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

      const presigned = parsePresigned(
        await client.request({
          method: "POST",
          path: "/signage/assets/presign",
          // 영상 형식은 생성된 계약 타입에 아직 없다(위 `UploadMimeType`).
          body: {
            fileName: file.name,
            mimeType:
              mimeType as ApiRequestBody<"PresignAssetRequestDto">["mimeType"],
            sizeBytes: file.size,
            checksum,
          } satisfies ApiRequestBody<"PresignAssetRequestDto">,
          signal,
        }),
      );

      await transport.put(presigned.uploadUrl, file, presigned.headers, {
        signal,
        onProgress: (ratio) => onProgress?.(ratio * TRANSFER_SHARE),
      });

      const complete = () =>
        client.request({
          method: "POST",
          path: `/signage/assets/${encodeURIComponent(presigned.assetId)}/complete`,
          signal,
          timeoutMs: COMPLETE_TIMEOUT_MS,
        });

      const deadline = now() + PROCESSING_DEADLINE_MS;
      let result = await complete();
      for (
        let retryAfter = processingRetryAfter(result);
        retryAfter !== null;
        retryAfter = processingRetryAfter(result)
      ) {
        onProcessing?.();
        if (now() + retryAfter * 1000 > deadline) throw processingTimedOut();
        await sleep(retryAfter * 1000, signal);
        result = await complete();
      }

      const asset = parseUploadedAsset(result);
      onProgress?.(1);
      return asset;
    },
  };
}
