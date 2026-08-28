import { cva } from "class-variance-authority";
import { getStatusMeta } from "@/entities/submission";
import type { StatusTone, SubmissionStatus } from "@/entities/submission";
import { cn } from "@/shared/lib/utils";

/**
 * 신청 상태 배지.
 *
 * 점(dot)과 옅은 틴트 배경으로 상태의 의미 축을 보조 신호로 준다. 색은 어디까지나
 * 보조다 — 구분은 문구가 맡고, 목록에서는 `getStatusSentence()`의 설명 문장을
 * 함께 두는 것을 전제로 한다. (명세 9.6)
 */
const toneClass = cva(
  "inline-flex shrink-0 items-center gap-1.5 rounded-pill px-2.5 py-1 text-overline whitespace-nowrap",
  {
    variants: {
      tone: {
        neutral: "bg-surface-muted text-ink-muted",
        attention: "bg-attention-subtle text-attention-strong",
        positive: "bg-success-subtle text-success-strong",
        info: "bg-info-subtle text-info-strong",
        pending: "bg-warning-subtle text-warning-strong",
      } satisfies Record<StatusTone, string>,
    },
    defaultVariants: { tone: "neutral" },
  },
);

const dotClass = cva("size-1.5 rounded-pill", {
  variants: {
    tone: {
      neutral: "bg-ink-subtle",
      attention: "bg-attention",
      positive: "bg-success",
      info: "bg-info",
      pending: "bg-warning",
    } satisfies Record<StatusTone, string>,
  },
  defaultVariants: { tone: "neutral" },
});

interface StatusBadgeProps extends React.ComponentProps<"span"> {
  status: SubmissionStatus;
}

export function StatusBadge({ status, className, ...props }: StatusBadgeProps) {
  const meta = getStatusMeta(status);

  return (
    <span className={cn(toneClass({ tone: meta.tone }), className)} {...props}>
      <span className={dotClass({ tone: meta.tone })} aria-hidden="true" />
      {meta.label}
    </span>
  );
}
