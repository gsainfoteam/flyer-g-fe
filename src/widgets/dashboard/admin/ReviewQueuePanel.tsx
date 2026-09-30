import { Link } from "react-router";
import { fromSubmissionView } from "@/entities/poster";
import { PosterThumb } from "@/entities/poster/ui/PosterThumb";
import type {
  SubmissionDecision,
  SubmissionView,
} from "@/entities/submission/model/types";
import { EmptyState, Panel } from "@/shared/components";
import { to } from "@/shared/config/routes";
import { formatElapsed, formatSeoulShortDate } from "@/shared/lib/datetime";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { PanelCount } from "../DashboardColumns";

/**
 * 검토 대기. 오래 기다린 순으로 놓고 가장 오래된 건 하나만 바탕을 띄운다.
 *
 * 승인·반려는 포스터와 공지를 보고 내리는 결정이라 여기서 바로 처리하지 않고 검토
 * 화면으로 보낸다. 반려·중단 뒤 고쳐서 다시 낸 건은 제목 옆에 알린다 — 지난번
 * 사유가 고쳐졌는지부터 보면 된다.
 */
const RESUBMISSION_TAG: Partial<Record<SubmissionDecision, string>> = {
  REJECTED: "고쳐서 다시 냄",
  SUSPENDED: "중단 뒤 다시 냄",
  APPROVED: "승인 뒤 수정함",
};

export function ReviewQueuePanel({
  submissions,
  totalCount,
  now,
}: {
  submissions: SubmissionView[];
  totalCount: number;
  now: Date;
}) {
  return (
    <Panel
      title={
        <>
          검토 대기
          <PanelCount value={totalCount} />
        </>
      }
      action={
        submissions.length > 0 && (
          <span className="text-caption text-ink-subtle">오래 기다린 순</span>
        )
      }
      flush
      bodyClassName="p-0"
    >
      {submissions.length === 0 ? (
        <EmptyState
          title="검토할 신청을 모두 처리했어요"
          description="새 신청이 들어오면 상단 ‘승인 대기’에 숫자로 표시돼요."
          className="px-5"
        />
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {submissions.map((submission, index) => {
            // 초안을 만든 때가 아니라 마지막으로 낸 때부터 센다.
            const waited = formatElapsed(
              submission.submittedAt ?? submission.createdAt,
              now,
            );
            const oldest = index === 0;
            const tag = submission.lastDecision
              ? RESUBMISSION_TAG[submission.lastDecision]
              : undefined;
            return (
              <li
                key={submission.id}
                className={cn(
                  "flex items-center gap-3.5 px-5 py-3",
                  oldest && "bg-attention-subtle/50",
                )}
              >
                <PosterThumb
                  poster={fromSubmissionView(submission)}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-body font-bold text-ink">
                    <span className="max-w-full truncate">
                      {submission.title}
                    </span>
                    {tag && (
                      <span className="shrink-0 rounded-pill bg-info-subtle px-2 py-0.5 text-overline text-info-strong">
                        {tag}
                      </span>
                    )}
                  </p>
                  <p className="truncate text-caption text-ink-subtle">
                    {/* 좁은 화면에서는 대기 시간을 오른쪽 대신 여기에 둔다. */}
                    <span className="sm:hidden">{waited} 대기 · </span>
                    {submission.requesterName} · {submission.categoryName} ·
                    게시 희망 {formatSeoulShortDate(submission.startAt)} ~{" "}
                    {formatSeoulShortDate(submission.endAt)}
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 text-label whitespace-nowrap max-sm:hidden",
                    oldest
                      ? "font-bold text-attention-strong"
                      : "font-normal text-ink-subtle",
                  )}
                >
                  {waited} 대기
                </span>
                <Button variant="secondary" size="sm" asChild>
                  <Link
                    to={to.reviewDetail(submission.id)}
                    aria-label={`${submission.title} 검토`}
                  >
                    검토
                  </Link>
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
