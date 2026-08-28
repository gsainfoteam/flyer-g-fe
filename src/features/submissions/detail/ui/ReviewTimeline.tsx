import { Check, OctagonPause, X } from "lucide-react";
import type { ComponentType } from "react";
import { getRejectionReasonLabel } from "@/entities/review";
import type { Review, ReviewDecision } from "@/entities/review/model/types";
import { formatSeoulDateTime } from "@/shared/lib/datetime";
import { cn } from "@/shared/lib/utils";

/**
 * 검토 이력 타임라인 (명세 FR-REV-04, FR-AUD-01의 표시 범위).
 *
 * 게시자가 "왜 이 상태가 됐는지"를 시간 순으로 따라갈 수 있게 한다.
 * 사유는 게시자에게 공개되는 것만 온다. 내부 메모나 raw payload는 그리지 않는다.
 */
interface TimelineEntryMeta {
  label: string;
  icon: ComponentType<{ className?: string }>;
  attention: boolean;
}

const DECISION_META: Record<ReviewDecision, TimelineEntryMeta> = {
  APPROVED: { label: "승인", icon: Check, attention: false },
  REJECTED: { label: "반려", icon: X, attention: true },
  SUSPENDED: { label: "게시 중단", icon: OctagonPause, attention: true },
};

interface ReviewTimelineProps {
  reviews: Review[];
  /** 신청이 처음 만들어진 시각. 타임라인의 시작점이다. */
  createdAt: Date;
}

export function ReviewTimeline({ reviews, createdAt }: ReviewTimelineProps) {
  const ordered = [...reviews].sort(
    (a, b) => a.reviewedAt.getTime() - b.reviewedAt.getTime(),
  );

  return (
    <ol className="flex flex-col">
      <TimelineRow
        label="신청 접수"
        at={createdAt}
        icon={Check}
        attention={false}
        first
      />
      {ordered.map((review) => {
        const meta = DECISION_META[review.decision];
        return (
          <TimelineRow
            key={review.id}
            label={`${meta.label} · ${review.reviewerName}`}
            detail={
              <>
                {review.reasonCode && (
                  <span className="font-semibold">
                    {getRejectionReasonLabel(review.reasonCode)} ·{" "}
                  </span>
                )}
                {review.comment}
              </>
            }
            at={review.reviewedAt}
            revision={review.revision}
            icon={meta.icon}
            attention={meta.attention}
          />
        );
      })}
    </ol>
  );
}

function TimelineRow({
  label,
  detail,
  at,
  revision,
  icon: Icon,
  attention,
  first = false,
}: {
  label: string;
  detail?: React.ReactNode;
  at: Date;
  revision?: number;
  icon: ComponentType<{ className?: string }>;
  attention: boolean;
  first?: boolean;
}) {
  return (
    <li className="relative flex gap-3 pb-5 last:pb-0">
      {!first && (
        <span
          aria-hidden="true"
          className="absolute top-[-14px] left-[13px] h-[14px] w-px bg-line"
        />
      )}
      <span
        className={cn(
          "grid size-[27px] shrink-0 place-items-center rounded-pill border",
          attention
            ? "border-attention-strong/30 bg-attention-subtle text-attention-strong"
            : "border-line bg-surface-muted text-ink-muted",
        )}
      >
        <Icon className="size-3.5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="text-label font-bold text-ink">
          {label}
          {revision !== undefined && (
            <span className="ml-1.5 font-normal text-ink-subtle">
              v{revision}
            </span>
          )}
        </p>
        {detail != null && detail !== "" && (
          <p
            className={cn(
              "mt-1 text-label leading-relaxed",
              attention ? "text-attention-strong" : "text-ink-muted",
            )}
          >
            {detail}
          </p>
        )}
        <p className="mt-0.5 text-caption text-ink-subtle">
          {formatSeoulDateTime(at)}
        </p>
      </div>
    </li>
  );
}
