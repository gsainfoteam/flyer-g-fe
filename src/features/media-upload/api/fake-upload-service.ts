import { ApiError } from "@/shared/api/error";
import type {
  AssetUploadService,
  UploadOptions,
  UploadedAsset,
} from "./asset-upload-service";

/**
 * 개발·테스트용 업로드 구현.
 *
 * 실제 네트워크 대신 진행률을 흉내 내고, 취소와 실패 후 재시도를 화면에서 확인할
 * 수 있게 한다. 서버 검증(EXIF 제거, 재인코딩, 바이러스 검사)은 흉내 내지 않는다.
 *
 * 미리보기용 blob URL은 세션이 끝날 때까지 해제하지 않는다. 만든 신청의 포스터가
 * 계속 보여야 하기 때문이며, mock 저장소와 수명을 맞춘 개발 전용 동작이다.
 */
export interface FakeUploadOptions {
  /** 진행률 tick 간격. 테스트에서는 0으로 둔다. */
  tickMs?: number;
  tickCount?: number;
  /**
   * 실패를 흉내 낼 조건. 기본값은 파일명에 `fail`이 들어간 파일의 첫 시도다.
   * 재시도 흐름을 개발 중에 눌러 보기 위한 장치다.
   */
  shouldFail?: (file: File, attempt: number) => boolean;
  /** 테스트에서 URL 생성을 대체한다. */
  createObjectUrl?: (file: File) => string;
}

// 첫 시도만 실패시킨다. 계속 실패하면 "다시 시도" 뒤의 성공 흐름을 볼 수 없다.
const defaultShouldFail = (file: File, attempt: number) =>
  attempt === 1 && file.name.toLowerCase().includes("fail");

/**
 * assetId → 미리보기 URL과 원본 크기.
 *
 * 실제 서버는 신청 응답에 포스터 URL과 크기를 담아 준다. mock 저장소에는 그 경로가
 * 없어서 개발 중에 만든 신청의 포스터가 빈칸이 된다. 개발 전용으로 둘을 이어 준다.
 */
export interface MockAsset {
  url: string;
  width: number;
  height: number;
}

const uploadedAssets = new Map<string, MockAsset>();

export function getMockAsset(assetId: string): MockAsset | null {
  return uploadedAssets.get(assetId) ?? null;
}

/** 서버처럼 원본 크기를 잰다. 브라우저가 아니면(jsdom) 0으로 둔다. */
async function measure(file: File): Promise<{ width: number; height: number }> {
  if (typeof createImageBitmap !== "function") return { width: 0, height: 0 };
  try {
    const bitmap = await createImageBitmap(file);
    try {
      return { width: bitmap.width, height: bitmap.height };
    } finally {
      bitmap.close();
    }
  } catch {
    return { width: 0, height: 0 };
  }
}

function uploadFailed(): ApiError {
  return new ApiError({
    kind: "network",
    code: "UPLOAD_FAILED",
    message: "업로드 중 연결이 끊겼습니다.",
  });
}

export function createFakeUploadService(
  options: FakeUploadOptions = {},
): AssetUploadService {
  const tickMs = options.tickMs ?? 120;
  const tickCount = Math.max(1, options.tickCount ?? 8);
  const shouldFail = options.shouldFail ?? defaultShouldFail;
  const createObjectUrl =
    options.createObjectUrl ?? ((file: File) => URL.createObjectURL(file));

  let sequence = 0;
  const attemptsByFile = new Map<string, number>();

  return {
    async upload(file: File, uploadOptions: UploadOptions = {}) {
      const { onProgress, signal } = uploadOptions;
      const fileKey = `${file.name}:${file.size}:${file.lastModified}`;
      const attempt = (attemptsByFile.get(fileKey) ?? 0) + 1;
      attemptsByFile.set(fileKey, attempt);

      const throwIfAborted = () => {
        if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
      };

      throwIfAborted();
      onProgress?.(0);

      for (let tick = 1; tick <= tickCount; tick++) {
        if (tickMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, tickMs));
        }
        throwIfAborted();

        // 실패는 절반쯤 올라간 뒤에 낸다. 진행률만 보고 성공을 단정하지 않게 한다.
        if (tick === Math.ceil(tickCount / 2) && shouldFail(file, attempt)) {
          throw uploadFailed();
        }
        onProgress?.(tick / tickCount);
      }

      sequence += 1;
      const assetId = `asset-mock-${sequence}`;
      const url = createObjectUrl(file);
      const { width, height } = await measure(file);
      uploadedAssets.set(assetId, { url, width, height });

      const asset: UploadedAsset = {
        assetId,
        url,
        width,
        height,
        mimeType: file.type,
        sizeBytes: file.size,
      };
      return asset;
    },
  };
}
