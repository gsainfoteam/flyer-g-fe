import { Inbox, TriangleAlert } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { isApiError, toTraceLabel, toUserMessage } from "@/shared/api/error";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Spinner } from "@/shared/ui/spinner";

/**
 * 로딩·빈 상태·오류를 화면마다 다르게 그리지 않도록 통일한다.
 * 오류 화면에는 내부 stack, token, request body를 노출하지 않는다. (명세 9.4, FR-PLY-06)
 */
const shell = "flex flex-col items-center justify-center gap-3 px-6 py-12 text-center";

interface LoadingStateProps {
  label?: string;
  className?: string;
}

export function LoadingState({
  label = "불러오는 중입니다.",
  className,
}: LoadingStateProps) {
  return (
    <div className={cn(shell, className)} role="status" aria-live="polite">
      <Spinner className="size-6 text-brand" aria-hidden="true" />
      <p className="text-body text-muted-foreground">{label}</p>
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  description?: ReactNode;
  icon?: LucideIcon;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn(shell, className)}>
      <span className="grid size-11 place-items-center rounded-pill bg-surface-muted text-ink-subtle">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div className="space-y-1">
        <p className="text-body font-semibold text-foreground">{title}</p>
        {description && (
          <p className="text-label text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
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
  title = "내용을 불러오지 못했습니다.",
  onRetry,
  retryLabel = "다시 시도",
  className,
}: ErrorStateProps) {
  const message = isApiError(error)
    ? toUserMessage(error)
    : "잠시 후 다시 시도해 주세요.";
  const trace = isApiError(error) ? toTraceLabel(error) : null;

  return (
    <div className={cn(shell, className)} role="alert">
      <span className="grid size-11 place-items-center rounded-pill bg-danger-subtle text-danger-strong">
        <TriangleAlert className="size-5" aria-hidden="true" />
      </span>
      <div className="space-y-1">
        <p className="text-body font-semibold text-foreground">{title}</p>
        <p className="text-label text-muted-foreground">{message}</p>
        {trace && <p className="text-caption text-ink-subtle">{trace}</p>}
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
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
  loadingLabel?: string;
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
  loadingLabel,
  empty,
  children,
}: PageStateProps) {
  if (isLoading) return <LoadingState label={loadingLabel} />;
  if (error !== undefined && error !== null) {
    return <ErrorState error={error} onRetry={onRetry} />;
  }
  if (isEmpty && empty) return <EmptyState {...empty} />;
  return <>{children}</>;
}
