import type { ReactNode } from "react";
import { isApiError, toTraceLabel, toUserMessage } from "@/shared/api/error";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";

/**
 * 로딩·빈 상태·오류를 화면마다 다르게 그리지 않도록 통일한다.
 *
 * 내용은 왼쪽에 맞춘다. 가운데로 모으면 빈 화면이 실패처럼 보인다.
 * 오류 화면에는 내부 stack, token, request body를 노출하지 않는다. (명세 9.4, FR-PLY-06)
 */

/** 골격만 그린다. 자리표시자가 실제 콘텐츠보다 눈에 띄지 않게. */
export function LoadingState({
  rows = 3,
  label = "불러오는 중입니다.",
  className,
}: {
  rows?: number;
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={cn("flex flex-col gap-4 py-2", className)}
      role="status"
      aria-live="polite"
    >
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-4" aria-hidden="true">
          <div className="aspect-3/4 w-10 shrink-0 rounded-thumb bg-surface-muted" />
          <div className="min-w-0 flex-1 space-y-2">
            <div
              className="h-3.5 rounded-thumb bg-surface-muted"
              style={{ width: `${64 - index * 8}%` }}
            />
            <div
              className="h-3 rounded-thumb bg-surface-muted"
              style={{ width: `${40 - index * 5}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

/**
 * 비어 있는 이유와 다음 행동. 글만으로 말한다.
 *
 * 아이콘이나 큰 제목을 두지 않는다. 비어 있는 칸이 화면에서 가장 눈에 띄면 안 된다.
 * 제목은 본문 크기로 한 줄, 설명은 그보다 흐리게 둔다.
 */
export function EmptyState({
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-start py-5", className)}>
      <h3 className="text-body font-bold text-ink">{title}</h3>
      {description && (
        <p className="mt-1 text-label font-normal text-ink-muted">
          {description}
        </p>
      )}
      {action && <div className="mt-3.5">{action}</div>}
    </div>
  );
}

interface ErrorStateProps {
  /** ApiError면 사용자 문구와 요청 ID를 자동으로 뽑는다. */
  error?: unknown;
  title?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export function ErrorState({
  error,
  title = "내용을 불러오지 못했어요",
  onRetry,
  retryLabel = "다시 불러오기",
  className,
}: ErrorStateProps) {
  const message = isApiError(error)
    ? toUserMessage(error)
    : "잠시 후 다시 시도해 주세요.";
  const trace = isApiError(error) ? toTraceLabel(error) : null;

  return (
    <div
      className={cn("flex flex-col items-start gap-3 py-6", className)}
      role="alert"
    >
      <h3 className="text-title text-attention-strong">{title}</h3>
      <div className="space-y-1">
        <p className="text-body text-ink-muted">{message}</p>
        {trace && <p className="text-caption text-ink-subtle">{trace}</p>}
      </div>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry} className="mt-1">
          {retryLabel}
        </Button>
      )}
    </div>
  );
}

interface PageStateProps {
  isLoading?: boolean;
  error?: unknown;
  isEmpty?: boolean;
  onRetry?: () => void;
  loadingRows?: number;
  empty?: EmptyStateProps;
  children: ReactNode;
}

/**
 * 로딩 → 오류 → 빈 상태 → 본문 순서로 한 번에 분기한다.
 * 각 화면이 같은 우선순위를 쓰도록 강제하는 것이 목적이다.
 */
export function PageState({
  isLoading = false,
  error,
  isEmpty = false,
  onRetry,
  loadingRows,
  empty,
  children,
}: PageStateProps) {
  if (isLoading) return <LoadingState rows={loadingRows} />;
  if (error !== undefined && error !== null) {
    return <ErrorState error={error} onRetry={onRetry} />;
  }
  if (isEmpty && empty) return <EmptyState {...empty} />;
  return <>{children}</>;
}
