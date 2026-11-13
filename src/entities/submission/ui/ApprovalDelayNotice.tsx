import { cn } from "@/shared/lib/utils";

export function ApprovalDelayNotice({ className }: { className?: string }) {
  return (
    <p className={cn("text-caption text-ink-muted", className)}>
      승인이 늦어지는 경우에는 “2026 GIST HOUSE” 카카오톡 채널로 문의해 주세요.
    </p>
  );
}
