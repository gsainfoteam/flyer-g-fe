import { Link } from "react-router";
import { to } from "@/app/router/routes";
import { getStatusSentence } from "@/entities/submission";
import type { SubmissionView } from "@/entities/submission/model/types";
import { EmptyState, Panel } from "@/shared/components";
import { formatElapsed, formatSeoulDateTime } from "@/shared/lib/datetime";
import { Button } from "@/shared/ui/button";
import { SubmissionRow } from "../common/SubmissionRow";

/**
 * 승인 대기 목록.
 *
 * 오래 기다린 순으로 놓고, 가장 오래 기다린 건 하나만 배경으로 띄운다.
 * 승인·반려는 근거를 봐야 하는 결정이라 여기서 바로 처리하지 않고 검토 상세로
 * 보낸다. (명세 FR-REV-02)
 */
interface ApprovalPanelProps {
  submissions: SubmissionView[];
  totalCount: number;
  now: Date;
  className?: string;
}

export function ApprovalPanel({
  submissions,
  totalCount,
  now,
  className,
}: ApprovalPanelProps) {
  return (
    <Panel
      title="오래 기다린 순"
      action={
        <span className="text-caption tabular-nums text-ink-subtle">
          {totalCount}건 중 {submissions.length}건
        </span>
      }
      flush
      className={className}
    >
      {submissions.length === 0 ? (
        <EmptyState
          title="처리할 신청이 없어요"
          description={
            <>
              새 신청이 들어오면 여기에 가장 먼저 보여드려요.
              <br />
              {formatSeoulDateTime(now)} 기준.
            </>
          }
          className="px-3"
        />
      ) : (
        <ul className="flex flex-col gap-0.5">
          {submissions.map((submission, index) => {
            // 초안을 만든 때가 아니라 마지막으로 낸 때부터 센다.
            const waited = formatElapsed(
              submission.submittedAt ?? submission.createdAt,
              now,
            );
            const urgent = index === 0;
            return (
              <SubmissionRow
                key={submission.id}
                submission={submission}
                highlighted={urgent}
                sentence={`${submission.organizationName} · ${getStatusSentence({
                  status: submission.status,
                  waitingLabel: waited,
                })}`}
                trailing={
                  <>
                    <span
                      className={
                        urgent
                          ? "shrink-0 text-label font-bold text-attention-strong"
                          : "shrink-0 text-label text-ink-subtle"
                      }
                    >
                      {waited} 대기
                    </span>
                    <Button variant="secondary" size="sm" asChild>
                      <Link to={to.reviewDetail(submission.id)}>검토</Link>
                    </Button>
                  </>
                }
              />
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
