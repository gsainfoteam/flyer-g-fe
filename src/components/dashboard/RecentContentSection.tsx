import { useMemo, useState } from "react";
import type { SubmissionStatus } from "@/entities/submission";
import type { SubmissionView } from "@/entities/submission/model/types";
import { EmptyState } from "@/shared/components";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { SubmissionRow } from "../common/SubmissionRow";

/**
 * 내 콘텐츠 목록.
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
    <section className="min-w-0 rounded-card border border-line bg-surface">
      <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-3">
        <h2 className="text-heading text-ink">내 콘텐츠</h2>
        <Button variant="link" size="sm" asChild>
          <a href="/studio">새 콘텐츠 등록</a>
        </Button>
      </div>

      <div
        role="tablist"
        aria-label="상태별 보기"
        className="flex gap-1 overflow-x-auto border-b border-line px-3 py-2"
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
                "shrink-0 rounded-control px-2.5 py-1 text-label transition",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
                active
                  ? "bg-brand text-brand-on"
                  : "text-ink-muted hover:bg-surface-muted hover:text-ink",
              )}
            >
              {tab.label}
              <span
                className={cn(
                  "ml-1.5 tabular-nums",
                  active ? "text-brand-on/75" : "text-ink-subtle",
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="해당 상태의 콘텐츠가 없습니다." />
      ) : (
        <ul className="divide-y divide-line px-5">
          {filtered.slice(0, PREVIEW_COUNT).map((submission) => (
            <SubmissionRow key={submission.id} submission={submission} />
          ))}
        </ul>
      )}

      {filtered.length > PREVIEW_COUNT && (
        <p className="border-t border-line px-5 py-2.5 text-caption text-ink-muted">
          {filtered.length}건 중 {PREVIEW_COUNT}건 표시 · 전체 목록은 준비 중입니다.
        </p>
      )}
    </section>
  );
}
