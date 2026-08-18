import { cva, type VariantProps } from "class-variance-authority";
import {
  Archive,
  Ban,
  CalendarClock,
  CircleCheck,
  CircleMinus,
  CircleOff,
  CircleX,
  Clock,
  FilePen,
  Monitor,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getStatusMeta } from "@/entities/submission";
import type { StatusTone, SubmissionStatus } from "@/entities/submission";
import { cn } from "@/shared/lib/utils";
import { Badge } from "@/shared/ui/badge";

/**
 * 신청 상태 배지.
 *
 * shadcn `Badge`의 variant는 제품 상태 tone(neutral/info/success/warning/danger)을
 * 표현하지 못하므로, 디자인 토큰으로 정의한 tone class를 이 한 곳에서 붙인다.
 * 화면에서 색을 다시 지정하지 않는다.
 *
 * 색만으로 상태를 구분하지 않도록 label과 icon을 항상 함께 그린다. (명세 9.6)
 */
const toneClass = cva("border", {
  variants: {
    tone: {
      neutral: "bg-surface-muted text-ink-muted border-line",
      info: "bg-info-subtle text-info-strong border-info/20",
      success: "bg-success-subtle text-success-strong border-success/20",
      warning: "bg-warning-subtle text-warning-strong border-warning/25",
      danger: "bg-danger-subtle text-danger-strong border-danger/20",
    } satisfies Record<StatusTone, string>,
  },
  defaultVariants: { tone: "neutral" },
});

const STATUS_ICONS: Record<SubmissionStatus, LucideIcon> = {
  DRAFT: FilePen,
  PENDING_REVIEW: Clock,
  REJECTED: CircleX,
  APPROVED: CircleCheck,
  SCHEDULED: CalendarClock,
  PUBLISHED: Monitor,
  ENDED: CircleOff,
  SUSPENDED: Ban,
  CANCELED: CircleMinus,
  ARCHIVED: Archive,
};

interface StatusBadgeProps
  extends Omit<React.ComponentProps<typeof Badge>, "variant" | "children">,
    Omit<VariantProps<typeof toneClass>, "tone"> {
  status: SubmissionStatus;
  /** 아이콘 없이 문구만 보여준다. 좁은 목록에서 쓴다. */
  hideIcon?: boolean;
}

export function StatusBadge({
  status,
  hideIcon = false,
  className,
  ...props
}: StatusBadgeProps) {
  const meta = getStatusMeta(status);
  const Icon = STATUS_ICONS[status];

  return (
    <Badge
      variant="outline"
      className={cn(toneClass({ tone: meta.tone }), className)}
      {...props}
    >
      {!hideIcon && <Icon aria-hidden="true" />}
      {meta.label}
    </Badge>
  );
}
