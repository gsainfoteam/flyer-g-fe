import { useCallback, useEffect, useRef, useState } from "react";
import { useAssetUploadService } from "../api/asset-upload-context";
import { normalizeApiError, toUserMessage } from "@/shared/api/error";
import type { UploadedAsset } from "../api/asset-upload-service";
import { validateImageFile } from "./validate-image";
import type { ImageValidationCode, ValidateImageFileOptions } from "./validate-image";

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
 */
export type PosterUploadStatus =
  | "idle"
  | "validating"
  | "invalid"
  | "uploading"
  | "failed"
  | "uploaded";

export interface PosterUploadState {
  status: PosterUploadStatus;
  file: File | null;
  /** 로컬 미리보기 URL. 업로드 전에도 미리보기에 쓴다. */
  previewUrl: string | null;
  /** 0~1 */
  progress: number;
  errorMessage: string | null;
  /** 검증 실패 원인. 화면이 안내 문구를 고를 때 쓴다. */
  invalidCode: ImageValidationCode | null;
  asset: UploadedAsset | null;
  dimensions: { width: number; height: number } | null;
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
};

export interface UsePosterUploadOptions {
  /** 테스트에서 decode를 대체한다. */
  validationOptions?: ValidateImageFileOptions;
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
  const validationOptions = options.validationOptions;

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
      dimensions: { width: number; height: number },
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
        dimensions,
      });

      try {
        const asset = await assetUpload.upload(file, {
          signal: controller.signal,
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
          asset,
        }));
      } catch (cause) {
        if (selectionRef.current !== selection) return;
        const error = normalizeApiError(cause);
        if (error.kind === "canceled") return;
        setState((current) => ({
          ...current,
          status: "failed",
          errorMessage: toUserMessage(error),
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

      const result = await validateImageFile(file, validationOptions);
      if (selectionRef.current !== selection) return;

      if (!result.ok) {
        setState(
          kept
            ? // 기존 포스터를 쓰면서 새 파일이 왜 안 됐는지만 알린다.
              { ...kept, errorMessage: result.message, invalidCode: result.code }
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
        width: result.width,
        height: result.height,
      });
    },
    [releasePreview, runUpload, validationOptions],
  );

  /** 업로드만 다시 한다. 검증은 이미 통과했으므로 반복하지 않는다. */
  const retry = useCallback(() => {
    const { file, previewUrl, dimensions } = state;
    if (state.status !== "failed" || !file || !previewUrl || !dimensions) return;
    void runUpload(file, selectionRef.current, previewUrl, dimensions);
  }, [runUpload, state]);

  const clear = useCallback(() => {
    selectionRef.current += 1;
    abortRef.current?.abort();
    releasePreview();
    setState(IDLE_STATE);
  }, [releasePreview]);

  return { state, selectFile, retry, clear };
}
