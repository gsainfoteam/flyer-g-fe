import { useCallback, useEffect, useRef, useState } from "react";
import { useAppServices } from "@/app/providers/services-context";
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
  const { assetUpload } = useAppServices();
  const [state, setState] = useState<PosterUploadState>(IDLE_STATE);

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
      abortRef.current?.abort();
      releasePreview();

      setState({ ...IDLE_STATE, status: "validating", file });

      const result = await validateImageFile(file, validationOptions);
      if (selectionRef.current !== selection) return;

      if (!result.ok) {
        setState({
          ...IDLE_STATE,
          status: "invalid",
          file,
          errorMessage: result.message,
          invalidCode: result.code,
        });
        return;
      }

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
