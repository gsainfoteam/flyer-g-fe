import { cva } from "class-variance-authority";
import { getStatusMeta } from "@/entities/submission";
import type { StatusTone, SubmissionStatus } from "@/entities/submission";
import { cn } from "@/shared/lib/utils";

/**
 * 신청 상태 배지.
 *
 * 단색 체계라 상태마다 색을 나누지 않는다. 게시자가 **고쳐야 하는 상태**
 * (반려됨·게시 중단)만 강조색으로 띄우고 나머지는 중성으로 둔다. 구분은 문구가
 * 맡는다. 목록에서는 `getStatusSentence()`의 설명 문장을 함께 두는 것을 전제로 한다.
 */
const toneClass = cva(
  "inline-flex shrink-0 items-center rounded-pill px-3 py-1.5 text-overline whitespace-nowrap",
  {
    variants: {
      tone: {
        neutral: "bg-surface-muted text-ink-muted",
        attention: "bg-attention-subtle text-attention-strong",
      } satisfies Record<StatusTone, string>,
    },
    defaultVariants: { tone: "neutral" },
  },
);

interface StatusBadgeProps extends React.ComponentProps<"span"> {
  status: SubmissionStatus;
}

export function StatusBadge({ status, className, ...props }: StatusBadgeProps) {
  const meta = getStatusMeta(status);

  return (
    <span className={cn(toneClass({ tone: meta.tone }), className)} {...props}>
      {meta.label}
    </span>
  );
}
