import type { SubmissionView } from "@/entities/submission/model/types";
import { EmptyState } from "@/shared/components";
import { SubmissionRow } from "../common/SubmissionRow";

/**
 * 승인 대기 목록(읽기 전용).
 *
 * 승인·반려 동작은 사유 입력, 버전 확인, 동시 처리 충돌 처리가 함께 필요해서
 * Phase 04에서 구현한다. 서버에 반영되지 않는 승인 버튼은 두지 않는다.
 * (명세 12.2가 지적한 프로토타입의 함정)
 */
interface ApprovalPanelProps {
  submissions: SubmissionView[];
}

export function ApprovalPanel({ submissions }: ApprovalPanelProps) {
  return (
    <section className="min-w-0 rounded-card border border-line bg-surface">
      <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-3">
        <h2 className="text-heading text-ink">승인 대기</h2>
        <span className="text-caption tabular-nums text-ink-muted">
          {submissions.length}건
        </span>
      </div>

      {submissions.length === 0 ? (
        <EmptyState title="승인 대기 항목이 없습니다." />
      ) : (
        <ul className="divide-y divide-line px-5">
          {submissions.map((submission) => (
            <SubmissionRow key={submission.id} submission={submission} />
          ))}
        </ul>
      )}
    </section>
  );
}
