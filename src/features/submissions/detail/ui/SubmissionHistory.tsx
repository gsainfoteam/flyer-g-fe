import {
  Ban,
  CalendarX,
  Check,
  OctagonPause,
  RotateCcw,
  Send,
  Tv,
  X,
} from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { getRejectionReasonLabel, isSystemEvent } from "@/entities/review";
import type {
  SubmissionEvent,
  SubmissionEventType,
} from "@/entities/review/model/types";
import { formatSeoulDateTime } from "@/shared/lib/datetime";
import { cn } from "@/shared/lib/utils";

/**
 * 처리 이력 타임라인 (명세 FR-REV-04, FR-AUD-01의 표시 범위).
 *
 * 게시자와 관리자가 "왜 지금 이 상태인지"를 시간 순으로 따라갈 수 있게 한다.
 * 사유는 게시자에게 공개되는 것만 온다. 내부 메모나 raw payload는 그리지 않는다.
 */
interface EventMeta {
  label: string;
  icon: ComponentType<{ className?: string }>;
  /** 게시자가 무언가를 고쳐야 하는 일 */
  attention: boolean;
}

const EVENT_META: Record<SubmissionEventType, EventMeta> = {
  SUBMITTED: { label: "신청", icon: Send, attention: false },
  RESUBMITTED: { label: "다시 신청", icon: RotateCcw, attention: false },
  APPROVED: { label: "승인", icon: Check, attention: false },
  REJECTED: { label: "반려", icon: X, attention: true },
  SUSPENDED: { label: "게시 중단", icon: OctagonPause, attention: true },
  CANCELED: { label: "신청 취소", icon: Ban, attention: false },
  PUBLISHED: { label: "TV에 걸림", icon: Tv, attention: false },
  ENDED: { label: "게시 종료", icon: CalendarX, attention: false },
};

interface SubmissionHistoryProps {
  events: SubmissionEvent[];
}

export function SubmissionHistory({ events }: SubmissionHistoryProps) {
  if (events.length === 0) {
    return (
      <p className="text-body text-ink-muted">
        아직 제출하지 않아 처리 이력이 없어요.
      </p>
    );
  }

  const ordered = [...events].sort(
    (a, b) => a.occurredAt.getTime() - b.occurredAt.getTime(),
  );

  return (
    <ol className="flex flex-col">
      {ordered.map((event, index) => {
        const meta = EVENT_META[event.type];
        const reason = event.reasonCode
          ? getRejectionReasonLabel(event.reasonCode)
          : null;
        return (
          <TimelineRow
            key={event.id}
            // 서버가 남긴 일(게시 시작·종료)에는 사람 이름이 없다.
            label={
              isSystemEvent(event)
                ? meta.label
                : `${meta.label} · ${event.actorName}`
            }
            detail={
              reason || event.comment ? (
                <>
                  {reason && <span className="font-semibold">{reason} · </span>}
                  {event.comment}
                </>
              ) : null
            }
            at={event.occurredAt}
            icon={meta.icon}
            attention={meta.attention}
            last={index === ordered.length - 1}
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
  icon: Icon,
  attention,
  last,
}: {
  label: string;
  detail: ReactNode;
  at: Date;
  icon: ComponentType<{ className?: string }>;
  attention: boolean;
  last: boolean;
}) {
  return (
    <li className="relative flex gap-3 pb-5 last:pb-0">
      {/*
       * 아이콘 아래에서 이 줄 끝까지 선을 긋는다. 다음 줄은 바로 아이콘으로 시작하므로
       * 사유 문구로 줄 높이가 달라져도 선이 끊기지 않는다.
       */}
      {!last && (
        <span
          aria-hidden="true"
          className="absolute top-6.75 bottom-0 left-3.25 w-px bg-line"
        />
      )}
      <span
        className={cn(
          "grid size-6.75 shrink-0 place-items-center rounded-pill border",
          attention
            ? "border-attention-strong/30 bg-attention-subtle text-attention-strong"
            : "border-line bg-surface-muted text-ink-muted",
        )}
      >
        <Icon className="size-3.5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="text-label font-bold text-ink">{label}</p>
        {detail && (
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
