import type { DecisionRecord, ReviewDecision } from "@/entities/review/model/types";
import { formatTimeAgo } from "@/shared/lib/datetime";
import { cn } from "@/shared/lib/utils";

/** 최근 처리. 누가 무엇을 승인·반려·중단했는지 짧게. (기획 4-0) */
const DECISION: Record<ReviewDecision, { label: string; className: string }> = {
  APPROVED: { label: "승인", className: "text-success-strong" },
  REJECTED: { label: "반려", className: "text-accent-700" },
  SUSPENDED: { label: "중단", className: "text-accent-700" },
};

export function RecentDecisions({
  title = "최근 처리",
  decisions,
  now,
}: {
  title?: string;
  decisions: DecisionRecord[];
  now: Date;
}) {
  return (
    <section
      aria-labelledby="recent-decisions"
      className="rounded-block bg-surface px-6 py-5.5 ring-1 ring-line"
    >
      <h2 id="recent-decisions" className="text-subhead text-ink">
        {title}
      </h2>
      {decisions.length === 0 ? (
        <p className="mt-3 text-label text-ink-muted">아직 처리한 건 없음</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-3 text-label">
          {decisions.map((record) => {
            const decision = DECISION[record.decision];
            return (
              <li key={record.id} className="flex items-center gap-2.5">
                <span
                  aria-hidden="true"
                  className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-muted text-overline font-extrabold text-ink-muted"
                >
                  {record.actorName.slice(0, 1)}
                </span>
                <span className="min-w-0 flex-1 truncate">
                  <span className="sr-only">{record.actorName} </span>
                  <b className={cn("font-bold", decision.className)}>
                    {decision.label}
                  </b>{" "}
                  {record.submissionTitle
                    ? `〈${record.submissionTitle}〉`
                    : "지워진 콘텐츠"}
                </span>
                <span className="shrink-0 text-overline font-normal text-ink-subtle">
                  {formatTimeAgo(record.occurredAt, now)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
