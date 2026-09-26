import { useRef, useState } from "react";
import { AlertTriangle, RotateCcw, UploadCloud, X } from "lucide-react";
import { ALLOWED_IMAGE_MIME_TYPES, MEDIA_CONSTRAINTS } from "@/entities/media";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { Spinner } from "@/shared/ui/spinner";
import { cn } from "@/shared/lib/utils";
import type { PosterUploadState } from "../model/use-poster-upload";

/**
 * 포스터 선택과 업로드 상태 (명세 FR-SUB-01).
 *
 * drag&drop과 파일 선택을 모두 받는다. drop만 지원하면 키보드 사용자가 올릴 수
 * 없고, 버튼만 지원하면 익숙한 동작을 막는다.
 *
 * 실패해도 파일을 놓지 않는다. 사용자는 같은 파일을 다시 찾아 고르지 않고 재시도만
 * 하면 된다.
 */
interface PosterDropzoneProps {
  state: PosterUploadState;
  onSelectFile: (file: File) => void;
  onRetry: () => void;
  onClear: () => void;
  /** 제출을 눌렀는데 포스터가 없을 때처럼, 폼 차원의 오류 */
  error?: string | null;
}

const ACCEPT = ALLOWED_IMAGE_MIME_TYPES.join(",");
const MAX_MB = Math.floor(MEDIA_CONSTRAINTS.maxSizeBytes / (1024 * 1024));

export function PosterDropzone({
  state,
  onSelectFile,
  onRetry,
  onClear,
  error,
}: PosterDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const busy = state.status === "validating" || state.status === "uploading";
  // 실제 원인(형식·용량·연결)이 폼 요약 문구("포스터를 올려 주세요")보다 구체적이다.
  const message = state.errorMessage ?? error;
  const showsError =
    state.status === "invalid" ||
    state.status === "failed" ||
    state.invalidCode !== null ||
    Boolean(error);

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (file) onSelectFile(file);
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setIsDraggingOver(true);
        }}
        onDragLeave={(event) => {
          // 안쪽 요소 위로 옮겨 가도 dragleave가 난다. 영역을 벗어날 때만 끈다.
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setIsDraggingOver(false);
          }
        }}
        onDrop={(event) => {
          event.preventDefault();
          setIsDraggingOver(false);
          if (busy) return;
          handleFiles(event.dataTransfer.files);
        }}
        className={cn(
          "rounded-card border border-dashed transition",
          isDraggingOver
            ? "border-accent bg-accent-100"
            : "border-line-strong bg-surface-muted/50",
          showsError && "border-danger",
        )}
      >
        <label
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center px-4 py-7 text-center",
            "focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus",
            busy && "cursor-progress",
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            className="sr-only"
            disabled={busy}
            aria-invalid={showsError || undefined}
            onChange={(event) => {
              handleFiles(event.target.files);
              // 같은 파일을 다시 골라도 change가 나도록 비운다.
              event.target.value = "";
            }}
          />
          <div className="grid size-10 place-items-center rounded-pill border border-line bg-surface text-ink-muted">
            {busy ? (
              <Spinner className="size-5" />
            ) : (
              <UploadCloud className="size-5" aria-hidden="true" />
            )}
          </div>
          <p className="mt-3 text-label text-ink">
            {busy
              ? state.status === "validating"
                ? "이미지를 확인하는 중"
                : "올리는 중"
              : "이미지를 끌어다 놓거나 선택하세요"}
          </p>
          <p className="mt-1 text-caption text-ink-muted">
            JPG, PNG, WebP · 최대 {MAX_MB}MB · 짧은 변{" "}
            {MEDIA_CONSTRAINTS.minShortEdgePx}px 이상
          </p>
          {!busy && (
            <span className="mt-3 rounded-control bg-ink px-3 py-1.5 text-caption text-surface">
              파일 선택
            </span>
          )}
        </label>

        {state.status === "uploading" && (
          <div className="px-4 pb-4">
            <div
              className="h-1.5 w-full overflow-hidden rounded-pill bg-line"
              role="progressbar"
              aria-label="업로드 진행률"
              aria-valuenow={Math.round(state.progress * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full bg-accent transition-[width]"
                style={{ width: `${Math.round(state.progress * 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {message && showsError && (
        <Alert variant="destructive">
          <AlertTriangle aria-hidden="true" />
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      {state.status === "failed" && (
        <Button variant="secondary" size="sm" onClick={onRetry} className="w-full">
          <RotateCcw aria-hidden="true" />
          다시 시도
        </Button>
      )}

      {state.previewUrl && (
        <div className="overflow-hidden rounded-control ring-1 ring-line">
          <div className="aspect-3/4 w-full bg-surface-muted">
            <img
              src={state.previewUrl}
              alt="선택한 포스터 미리보기"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="flex items-center justify-between gap-2 bg-surface px-2.5 py-2">
            <span className="truncate text-caption text-ink-muted">
              {state.dimensions
                ? `${state.dimensions.width}×${state.dimensions.height}`
                : ""}
              {state.status === "uploaded" ? " · 업로드 완료" : ""}
            </span>
            <Button variant="ghost" size="sm" onClick={onClear}>
              <X aria-hidden="true" />
              지우기
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
