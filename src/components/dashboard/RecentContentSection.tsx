import { useMemo, useState } from "react";
import { Link } from "react-router";
import { to } from "@/app/router/routes";
import { getStatusSentence, groupOfStatus } from "@/entities/submission";
import type { SubmissionStatus } from "@/entities/submission";
import type { SubmissionView } from "@/entities/submission/model/types";
import { EmptyState, Panel, StatusBadge } from "@/shared/components";
import {
  formatSeoulDateTime,
  formatSeoulShortDate,
} from "@/shared/lib/datetime";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { SubmissionRow } from "../common/SubmissionRow";

/**
 * 내 신청 목록.
 *
 * 각 행은 상태 배지와 함께 "지금 어떤 상황인지" 한 문장을 보여준다. 배지 색을
 * 구분하지 못해도 무엇을 해야 하는지 알 수 있어야 한다.
 *
 * 대시보드용 미리보기라 최근 몇 건만 보여주고, 전체는 목록 페이지가 맡는다.
 */
type FilterKey = "ALL" | SubmissionStatus;

const filterTabs: { key: FilterKey; label: string }[] = [
  { key: "ALL", label: "전체" },
  { key: "PUBLISHED", label: "게시 중" },
  { key: "SCHEDULED", label: "예약됨" },
  { key: "PENDING_REVIEW", label: "승인 대기" },
  { key: "REJECTED", label: "반려됨" },
  { key: "ENDED", label: "종료됨" },
];

const PREVIEW_COUNT = 6;

function sentenceFor(submission: SubmissionView): string {
  return getStatusSentence({
    status: submission.status,
    startsAtLabel: formatSeoulDateTime(submission.startAt),
    endsAtLabel: formatSeoulShortDate(submission.endAt),
  });
}

interface RecentContentSectionProps {
  submissions: SubmissionView[];
}

export function RecentContentSection({ submissions }: RecentContentSectionProps) {
  const [filter, setFilter] = useState<FilterKey>("ALL");

  const counts = useMemo(() => {
    const result = new Map<FilterKey, number>([["ALL", submissions.length]]);
    for (const submission of submissions) {
      result.set(submission.status, (result.get(submission.status) ?? 0) + 1);
    }
    return result;
  }, [submissions]);

  const filtered = useMemo(
    () =>
      filter === "ALL"
        ? submissions
        : submissions.filter((submission) => submission.status === filter),
    [submissions, filter],
  );

  return (
    <Panel
      title="내 신청"
      action={
        <Button variant="link" size="xs" asChild>
          <Link to={to.studio()}>새 신청 →</Link>
        </Button>
      }
      flush
    >
      <div
        role="tablist"
        aria-label="상태별 보기"
        className="mb-1.5 flex gap-5 overflow-x-auto border-b border-line px-3"
      >
        {filterTabs.map((tab) => {
          const active = filter === tab.key;
          const count = counts.get(tab.key) ?? 0;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(tab.key)}
              className={cn(
                "relative shrink-0 pt-1.5 pb-2.5 text-label transition-colors duration-150",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
                "after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded-pill",
                active
                  ? "font-semibold text-ink after:bg-ink"
                  : "font-medium text-ink-muted after:bg-transparent hover:text-ink",
              )}
            >
              {tab.label}
              <span
                className={cn(
                  "ml-1.5 tabular-nums",
                  active ? "text-ink-muted" : "text-ink-subtle",
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="해당 상태의 신청이 없어요"
          description="다른 상태를 눌러 보세요."
          className="px-3"
        />
      ) : (
        // 구분선은 li에 그린다. rounded가 걸린 행 안쪽에 그리면 모서리를 따라 휜다.
        <ul className="flex flex-col divide-y divide-line">
          {filtered.slice(0, PREVIEW_COUNT).map((submission) => (
            <SubmissionRow
              key={submission.id}
              submission={submission}
              sentence={sentenceFor(submission)}
              href={to.submissionDetail(submission.id)}
              trailing={<StatusBadge status={submission.status} />}
            />
          ))}
        </ul>
      )}

      {filtered.length > PREVIEW_COUNT && (
        <div className="border-t border-line px-3 pt-2 pb-1">
          <Button variant="link" size="xs" asChild>
            <Link
              to={to.submissions(
                filter === "ALL" ? undefined : groupOfStatus(filter).key,
              )}
            >
              전체 {filtered.length}건 보기 →
            </Link>
          </Button>
        </div>
      )}
    </Panel>
  );
}
