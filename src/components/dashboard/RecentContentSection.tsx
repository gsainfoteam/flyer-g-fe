import { useMemo, useState } from "react";
import { getStatusSentence } from "@/entities/submission";
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
 * 전체 접근을 위한 pagination과 URL 필터 동기화는 Phase 03 범위다.
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
          <a href="/studio">새 신청 →</a>
        </Button>
      }
      flush
    >
      <div
        role="tablist"
        aria-label="상태별 보기"
        className="mb-1 flex gap-1 overflow-x-auto px-1 pb-1"
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
                "shrink-0 rounded-pill px-3.5 py-2 text-label font-semibold transition",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
                active
                  ? "bg-ink text-ink-inverse"
                  : "text-ink-muted hover:bg-surface-muted hover:text-ink",
              )}
            >
              {tab.label}
              <span
                className={cn(
                  "ml-1.5 tabular-nums",
                  active ? "text-ink-inverse/70" : "text-ink-subtle",
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
        <ul className="flex flex-col">
          {filtered.slice(0, PREVIEW_COUNT).map((submission, index) => (
            <SubmissionRow
              key={submission.id}
              submission={submission}
              sentence={sentenceFor(submission)}
              className={index > 0 ? "border-t border-line" : undefined}
              trailing={<StatusBadge status={submission.status} />}
            />
          ))}
        </ul>
      )}

      {filtered.length > PREVIEW_COUNT && (
        <p className="px-4 pt-3 pb-1 text-caption text-ink-muted">
          {filtered.length}건 중 {PREVIEW_COUNT}건 · 전체 목록은 준비 중이에요
        </p>
      )}
    </Panel>
  );
}
