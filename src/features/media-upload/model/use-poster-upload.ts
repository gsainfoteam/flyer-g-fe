import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAssetUploadService } from "../api/asset-upload-context";
import { normalizeApiError, toUserMessage } from "@/shared/api/error";
import type { ApiError } from "@/shared/api/error";
import type { UploadedAsset } from "../api/asset-upload-service";
import { validateImageFile } from "./validate-image";
import type {
  ImageValidationCode,
  ValidateImageFileOptions,
} from "./validate-image";
import { validateVideoFile } from "./validate-video";
import type { VideoProbe, VideoValidationCode } from "./validate-video";

/**
 * 포스터 한 장의 선택 → 검증 → 업로드 수명을 한곳에서 관리한다.
 *
 * 미리보기 blob URL은 파일을 교체하거나 화면을 떠날 때 반드시 해제한다.
 * 해제하지 않으면 이미지 하나당 수 MB가 탭이 닫힐 때까지 남는다.
 *
 * 업로드가 실패해도 파일 선택은 유지한다. 사용자가 다시 고르지 않고 재시도할 수
 * 있어야 한다. (명세 FR-SUB-01 인수 조건)
 *
 * 이미 올린 포스터가 있을 때 새 파일을 고르면, 새 파일이 검증을 통과한 뒤에야
 * 바꾼다. 형식이 틀린 파일을 잘못 고른 것만으로 멀쩡히 올린 포스터를 잃으면 안 된다.
 *
 * 영상 포스터(배포 ①)는 운영 설정이 영상을 받을 때만 고를 수 있다. 파일을 다 보낸
 * 뒤 서버가 변환하는 동안은 `processing`이다.
 */
export type PosterUploadStatus =
  "idle" | "validating" | "invalid" | "uploading" | "failed" | "uploaded";

export interface PosterUploadState {
  status: PosterUploadStatus;
  file: File | null;
  /** 로컬 미리보기 URL. 업로드 전에도 미리보기에 쓴다. */
  previewUrl: string | null;
  /** 0~1 */
  progress: number;
  errorMessage: string | null;
  /** 검증 실패 원인. 화면이 안내 문구를 고를 때 쓴다. */
  invalidCode: ImageValidationCode | VideoValidationCode | null;
  asset: UploadedAsset | null;
  /** 원본 크기. 브라우저가 영상을 읽지 못했으면 null */
  dimensions: { width: number; height: number } | null;
  mediaKind: "IMAGE" | "VIDEO";
  /** 영상 길이(ms). 이미지이거나 읽지 못했으면 null */
  durationMs: number | null;
  /** 파일은 다 보냈고 서버가 영상을 변환하는 중 */
  processing: boolean;
}

const IDLE_STATE: PosterUploadState = {
  status: "idle",
  file: null,
  previewUrl: null,
  progress: 0,
  errorMessage: null,
  invalidCode: null,
  asset: null,
  dimensions: null,
  mediaKind: "IMAGE",
  durationMs: null,
  processing: false,
};

/** 업로드 한도. 서버 운영 설정(`GET /signage/config`)에서 온다. */
export interface UploadLimits {
  maxSizeBytes: number;
  /** 영상을 받는 환경인가(`allowedMimeTypes`에 `video/*`가 있다). 없으면 받지 않는다. */
  acceptsVideo?: boolean;
  maxVideoSizeBytes?: number;
  maxVideoDurationSeconds?: number;
}

interface MediaMeta {
  dimensions: { width: number; height: number } | null;
  mediaKind: "IMAGE" | "VIDEO";
  durationMs: number | null;
}

export interface UsePosterUploadOptions {
  /** 테스트에서 decode를 대체한다. */
  validationOptions?: ValidateImageFileOptions;
  /** 테스트에서 영상 메타데이터 읽기를 대체한다. */
  videoProbe?: VideoProbe;
  /** 서버가 쓰는 한도. 아직 받지 못했으면 기본값으로 먼저 거르고 서버가 다시 본다. */
  limits?: UploadLimits | null;
}

/**
 * 서버가 파일을 거절한 이유. 사용자에게 보여줄 문구를 필드로 준다
 * (`fields.file`: 이미지·영상 검사(길이·해상도·코덱 포함), `fields.sizeBytes`: 용량, `fields.mimeType`: 형식).
 */
function uploadErrorMessage(error: ApiError): string {
  const fields = error.fields ?? {};
  return (
    fields.file ?? fields.sizeBytes ?? fields.mimeType ?? toUserMessage(error)
  );
}

function validateMedia(
  file: File,
  limits: UploadLimits | null | undefined,
  imageOptions: ValidateImageFileOptions,
  videoProbe: VideoProbe | undefined,
) {
  if (!file.type.startsWith("video/")) {
    return validateImageFile(file, imageOptions).then((result) =>
      result.ok
        ? {
            ...result,
            dimensions: { width: result.width, height: result.height },
            mediaKind: "IMAGE" as const,
            durationMs: null,
          }
        : result,
    );
  }
  if (!limits?.acceptsVideo) {
    return Promise.resolve({
      ok: false as const,
      code: "UNSUPPORTED_TYPE" as const,
      message:
        "영상 업로드는 지원하지 않습니다. JPG, PNG, WebP 이미지를 업로드하세요.",
    });
  }
  return validateVideoFile(file, {
    probe: videoProbe,
    maxSizeBytes: limits.maxVideoSizeBytes,
    maxDurationSeconds: limits.maxVideoDurationSeconds,
  }).then((result) =>
    result.ok
      ? {
          ...result,
          dimensions:
            result.width > 0 && result.height > 0
              ? { width: result.width, height: result.height }
              : null,
          mediaKind: "VIDEO" as const,
        }
      : result,
  );
}

export function usePosterUpload(options: UsePosterUploadOptions = {}) {
  const assetUpload = useAssetUploadService();
  const [state, setState] = useState<PosterUploadState>(IDLE_STATE);
  /** 이벤트 처리 중에 지금 상태를 읽는다. 렌더 뒤에 맞춰진다. */
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const previewUrlRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  /** 이전 선택의 결과가 뒤늦게 도착해 새 선택을 덮어쓰지 않게 한다. */
  const selectionRef = useRef(0);
  const limits = options.limits;
  const videoProbe = options.videoProbe;
  const validationOptions = useMemo(
    () => ({
      ...(limits ? { maxSizeBytes: limits.maxSizeBytes } : {}),
      ...options.validationOptions,
    }),
    [limits, options.validationOptions],
  );

  const releasePreview = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      releasePreview();
    };
  }, [releasePreview]);

  const runUpload = useCallback(
    async (
      file: File,
      selection: number,
      previewUrl: string,
      meta: MediaMeta,
    ) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setState({
        status: "uploading",
        file,
        previewUrl,
        progress: 0,
        errorMessage: null,
        invalidCode: null,
        asset: null,
        ...meta,
        processing: false,
      });

      try {
        const asset = await assetUpload.upload(file, {
          signal: controller.signal,
          onProcessing: () => {
            if (selectionRef.current !== selection) return;
            setState((current) =>
              current.status === "uploading"
                ? { ...current, processing: true }
                : current,
            );
          },
          onProgress: (ratio) => {
            if (selectionRef.current !== selection) return;
            setState((current) =>
              current.status === "uploading"
                ? { ...current, progress: ratio }
                : current,
            );
          },
        });
        if (selectionRef.current !== selection) return;
        setState((current) => ({
          ...current,
          status: "uploaded",
          progress: 1,
          processing: false,
          asset,
          // 서버가 잰 길이·크기가 브라우저가 읽은 값보다 정확하다.
          durationMs: asset.durationMs ?? current.durationMs,
          dimensions:
            asset.width > 0 && asset.height > 0
              ? { width: asset.width, height: asset.height }
              : current.dimensions,
        }));
      } catch (cause) {
        if (selectionRef.current !== selection) return;
        const error = normalizeApiError(cause);
        if (error.kind === "canceled") return;
        setState((current) => ({
          ...current,
          status: "failed",
          processing: false,
          errorMessage: uploadErrorMessage(error),
        }));
      }
    },
    [assetUpload],
  );

  const selectFile = useCallback(
    async (file: File) => {
      const selection = selectionRef.current + 1;
      selectionRef.current = selection;

      // 올려 둔 포스터는 새 파일이 통과할 때까지 그대로 둔다.
      const kept =
        stateRef.current.status === "uploaded" ? stateRef.current : null;
      if (kept) {
        setState({ ...kept, errorMessage: null, invalidCode: null });
      } else {
        abortRef.current?.abort();
        releasePreview();
        setState({ ...IDLE_STATE, status: "validating", file });
      }

      const result = await validateMedia(
        file,
        limits,
        validationOptions,
        videoProbe,
      );
      if (selectionRef.current !== selection) return;

      if (!result.ok) {
        setState(
          kept
            ? // 기존 포스터를 쓰면서 새 파일이 왜 안 됐는지만 알린다.
              {
                ...kept,
                errorMessage: result.message,
                invalidCode: result.code,
              }
            : {
                ...IDLE_STATE,
                status: "invalid",
                file,
                errorMessage: result.message,
                invalidCode: result.code,
              },
        );
        return;
      }

      abortRef.current?.abort();
      releasePreview();
      const previewUrl = URL.createObjectURL(file);
      previewUrlRef.current = previewUrl;

      await runUpload(file, selection, previewUrl, {
        dimensions: result.dimensions,
        mediaKind: result.mediaKind,
        durationMs: result.durationMs,
      });
    },
    [limits, releasePreview, runUpload, validationOptions, videoProbe],
  );

  /** 업로드만 다시 한다. 검증은 이미 통과했으므로 반복하지 않는다. */
  const retry = useCallback(() => {
    const { file, previewUrl, dimensions, mediaKind, durationMs } = state;
    if (state.status !== "failed" || !file || !previewUrl) return;
    void runUpload(file, selectionRef.current, previewUrl, {
      dimensions,
      mediaKind,
      durationMs,
    });
  }, [runUpload, state]);

  const clear = useCallback(() => {
    selectionRef.current += 1;
    abortRef.current?.abort();
    releasePreview();
    setState(IDLE_STATE);
  }, [releasePreview]);

  return { state, selectFile, retry, clear };
}
