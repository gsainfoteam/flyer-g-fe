import { Link } from "react-router";
import type { ImpressionStatsItem } from "@/entities/impression/model/types";
import { fromSubmissionView } from "@/entities/poster";
import { PosterThumb } from "@/entities/poster/ui/PosterThumb";
import type { SubmissionView } from "@/entities/submission/model/types";
import { Panel } from "@/shared/components";
import { to } from "@/shared/config/routes";
import { formatSeoulShortDate } from "@/shared/lib/datetime";
import { Button } from "@/shared/ui/button";
import { PanelCount } from "../DashboardColumns";

/**
 * 끝난 신청(종료·취소) 몇 건. 종료된 건은 TV에 몇 번 나왔는지 함께 둔다.
 * 지난 신청이 없으면 칸을 그리지 않는다.
 */
export function PastSubmissionsPanel({
  submissions,
  totalCount,
  impressions,
}: {
  submissions: SubmissionView[];
  totalCount: number;
  impressions: Map<string, ImpressionStatsItem>;
}) {
  if (submissions.length === 0) return null;

  return (
    <Panel
      title={
        <>
          지난 신청
          <PanelCount value={totalCount} />
        </>
      }
      action={
        <Button variant="link" size="xs" asChild>
          <Link to={to.submissions()}>전체 →</Link>
        </Button>
      }
      flush
      bodyClassName="p-0"
    >
      <ul className="flex flex-col divide-y divide-line">
        {submissions.map((submission) => {
          const shown = impressions.get(submission.id)?.impressions;
          return (
            <li key={submission.id}>
              <Link
                to={to.submissionDetail(submission.id)}
                className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-surface-muted/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
              >
                <PosterThumb
                  poster={fromSubmissionView(submission)}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-label font-semibold text-ink">
                    {submission.title}
                  </p>
                  <p className="text-caption text-ink-subtle">
                    {submission.status === "CANCELED"
                      ? "게시 전에 취소함"
                      : [
                          `${formatSeoulShortDate(submission.endAt)} 종료`,
                          shown !== undefined &&
                            `${shown.toLocaleString("ko-KR")}회 노출`,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
