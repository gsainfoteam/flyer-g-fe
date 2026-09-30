import { Link } from "react-router";
import { fromSubmissionView } from "@/entities/poster";
import { PosterThumb } from "@/entities/poster/ui/PosterThumb";
import type { SubmissionView } from "@/entities/submission/model/types";
import { EmptyState, Panel } from "@/shared/components";
import { to } from "@/shared/config/routes";
import { formatSeoulShortDate, seoulDayDiff } from "@/shared/lib/datetime";
import { Button } from "@/shared/ui/button";
import { PanelCount } from "../DashboardColumns";

/**
 * 지금 TV에 걸려 있는 포스터. 곧 내려가는 것부터 둔다.
 *
 * 관리자가 알고 싶은 건 "지금 무엇이 나오고 있고, 언제 빠지는가"다. 넓은 칸에서는
 * 신청자와 남은 날까지, 좁은 칸(`compact`)에서는 제목과 내려가는 날만 보여준다.
 */
export function OnAirPanel({
  submissions,
  now,
  limit,
  compact = false,
}: {
  /** 게시 중인 신청 전체. 여기서 정렬하고 자른다. */
  submissions: SubmissionView[];
  now: Date;
  limit: number;
  compact?: boolean;
}) {
  const shown = [...submissions]
    .sort((a, b) => a.endAt.getTime() - b.endAt.getTime())
    .slice(0, limit);

  return (
    <Panel
      title={
        <>
          지금 게시 중
          <PanelCount value={submissions.length} />
        </>
      }
      action={
        submissions.length > 0 && (
          <Button variant="link" size="xs" asChild>
            <Link to={to.submissions("published", { scope: "all" })}>
              전체 보기 →
            </Link>
          </Button>
        )
      }
      flush
      bodyClassName="p-0"
    >
      {shown.length === 0 ? (
        <EmptyState
          title="지금 게시 중인 포스터가 없어요"
          description="TV에는 Ziggle에서 신청하라는 안내가 나오고 있어요."
          className="px-5"
        />
      ) : (
        <ul
          className={
            compact
              ? "flex flex-col divide-y divide-line/70 px-5 py-1"
              : "flex flex-col divide-y divide-line"
          }
        >
          {shown.map((submission) => {
            const left = seoulDayDiff(now, submission.endAt);
            return compact ? (
              <li
                key={submission.id}
                className="flex items-center gap-2.5 py-2.5 text-label"
              >
                <PosterThumb
                  poster={fromSubmissionView(submission)}
                  size="xs"
                />
                <Link
                  to={to.submissionDetail(submission.id)}
                  className="min-w-0 flex-1 truncate font-semibold text-ink hover:underline"
                >
                  {submission.title}
                </Link>
                <span
                  className={
                    left <= 0
                      ? "shrink-0 text-caption font-bold text-ink"
                      : "shrink-0 text-caption text-ink-subtle tabular-nums"
                  }
                >
                  {left <= 0
                    ? "오늘 내려감"
                    : `${formatSeoulShortDate(submission.endAt)}까지`}
                </span>
              </li>
            ) : (
              <li key={submission.id}>
                <Link
                  to={to.submissionDetail(submission.id)}
                  className="flex items-center gap-3 px-5 py-2.5 transition-colors hover:bg-surface-muted/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
                >
                  <PosterThumb
                    poster={fromSubmissionView(submission)}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-label font-semibold text-ink">
                      {submission.title}
                    </p>
                    <p className="truncate text-caption text-ink-subtle">
                      {submission.requesterName} · {submission.categoryName}
                    </p>
                  </div>
                  <div className="shrink-0 text-right tabular-nums">
                    <p className="text-label font-semibold text-ink">
                      {formatSeoulShortDate(submission.endAt)}
                    </p>
                    <p className="text-caption text-ink-subtle">
                      {left <= 0 ? "오늘 내려감" : `${left}일 남음`}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
