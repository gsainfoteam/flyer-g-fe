import { Link } from "react-router";
import type { ReviewDecision } from "@/entities/review/model/types";
import { useRecentDecisions } from "@/features/reviews/api/queries";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  Panel,
} from "@/shared/components";
import { to } from "@/shared/config/routes";
import { formatSeoulDayTime } from "@/shared/lib/datetime";
import { cn } from "@/shared/lib/utils";

/**
 * 최근 처리. 누가 어떤 신청을 승인·반려·중단했는지 최신순으로.
 *
 * 관리자가 여럿이면 서로 무엇을 처리했는지 여기서 이어 본다. 넓은 칸(`wide`)에서는
 * 한 줄에, 좁은 칸에서는 제목 아래에 결정과 사람을 둔다.
 */
const DECISION_LABEL: Record<ReviewDecision, string> = {
  APPROVED: "승인",
  REJECTED: "반려",
  SUSPENDED: "게시 중단",
};

const DECISION_TONE: Record<ReviewDecision, string> = {
  APPROVED: "text-success-strong",
  REJECTED: "text-attention-strong",
  SUSPENDED: "text-warning-strong",
};

export function RecentDecisionsPanel({
  limit,
  now,
  wide = false,
}: {
  limit: number;
  now: Date;
  wide?: boolean;
}) {
  const decisions = useRecentDecisions(limit);

  return (
    <Panel title="최근 처리" flush bodyClassName="p-0">
      {decisions.isPending ? (
        <LoadingState
          rows={2}
          label="처리 기록을 불러오고 있어요."
          className="px-5 py-4"
        />
      ) : decisions.error ? (
        <ErrorState
          error={decisions.error}
          title="처리 기록을 불러오지 못했어요"
          onRetry={() => void decisions.refetch()}
          className="px-5"
        />
      ) : decisions.data.length === 0 ? (
        <EmptyState title="아직 처리한 신청이 없어요" className="px-5" />
      ) : (
        <ul className="flex flex-col divide-y divide-line/70">
          {decisions.data.map((record) => {
            const decision = (
              <span className={cn("font-bold", DECISION_TONE[record.decision])}>
                {DECISION_LABEL[record.decision]}
              </span>
            );
            const title = record.submissionTitle ? (
              <Link
                to={to.submissionDetail(record.submissionId)}
                className="truncate font-semibold text-ink hover:underline"
              >
                {record.submissionTitle}
              </Link>
            ) : (
              <span className="truncate text-ink-subtle">지워진 신청</span>
            );
            const who = `${record.actorName} · ${formatSeoulDayTime(record.occurredAt, now)}`;

            return wide ? (
              <li
                key={record.id}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 px-5 py-3 text-label"
              >
                <span className="w-16 shrink-0">{decision}</span>
                <span className="flex min-w-0 flex-1">{title}</span>
                {/* 좁은 화면에서는 사람과 시각을 다음 줄로 내린다. */}
                <span className="shrink-0 text-caption text-ink-subtle tabular-nums max-sm:basis-full max-sm:pl-19">
                  {who}
                </span>
              </li>
            ) : (
              <li key={record.id} className="px-5 py-3 text-label">
                <p className="flex min-w-0">{title}</p>
                <p className="mt-0.5 text-caption text-ink-subtle tabular-nums">
                  {decision} · {who}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
