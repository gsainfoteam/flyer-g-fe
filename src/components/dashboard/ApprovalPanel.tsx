import { fromSubmissionView } from "@/entities/poster";
import type { SubmissionView } from "@/entities/submission/model/types";
import { EmptyState, StatusBadge } from "@/shared/components";
import { formatSeoulDateTime } from "@/shared/lib/datetime";
import { Badge } from "@/shared/ui/badge";
import { PosterArtwork } from "../common/PosterArtwork";

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
    <section className="rounded-card border border-line bg-surface p-5 shadow-card">
      <div className="flex items-center justify-between">
        <h2 className="text-heading text-ink">승인 대기</h2>
        <Badge variant="outline" className="bg-brand-subtle text-brand-strong">
          {submissions.length}건
        </Badge>
      </div>

      <div className="mt-4 space-y-3">
        {submissions.map((submission) => (
          <div key={submission.id} className="flex items-center gap-3">
            <div className="aspect-[3/4] w-9 shrink-0 overflow-hidden rounded-md bg-surface-muted">
              <PosterArtwork poster={fromSubmissionView(submission)} fit="cover" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-body font-semibold text-ink">
                {submission.title}
              </p>
              <p className="mt-0.5 truncate text-caption text-ink-subtle">
                {submission.organizationName} ·{" "}
                {formatSeoulDateTime(submission.startAt)} 시작
              </p>
            </div>
            <StatusBadge status={submission.status} hideIcon className="shrink-0" />
          </div>
        ))}

        {submissions.length === 0 && (
          <EmptyState title="승인 대기 항목이 없습니다." />
        )}
      </div>
    </section>
  );
}
