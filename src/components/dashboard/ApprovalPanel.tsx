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
 * 승인·반려 동작은 사유 입력, 버전 확인, 동시 처리 충돌 처리가 함께 필요해서
 * Phase 04에서 구현한다. 서버에 반영되지 않는 승인 버튼은 두지 않는다.
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
            const waited = formatElapsed(submission.createdAt, now);
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
                    <Button variant="secondary" size="sm" disabled>
                      검토
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
