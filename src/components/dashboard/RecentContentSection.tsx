import { useMemo, useState } from "react";
import type { SubmissionStatus } from "@/entities/submission";
import type { SubmissionView } from "@/entities/submission/model/types";
import { EmptyState, SectionHeader } from "@/shared/components";
import { Button } from "@/shared/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { PosterCard } from "../common/PosterCard";

/**
 * 내 콘텐츠 목록.
 *
 * 전체 접근을 위한 pagination과 URL 필터 동기화는 Phase 03 범위다.
 * 여기서는 목록의 출처를 fixture에서 repository로 옮기는 것까지만 한다.
 */
type FilterKey = "ALL" | SubmissionStatus;

const filterTabs: { key: FilterKey; label: string }[] = [
  { key: "ALL", label: "전체" },
  { key: "PUBLISHED", label: "게시 중" },
  { key: "SCHEDULED", label: "예약됨" },
  { key: "PENDING_REVIEW", label: "승인 대기" },
  { key: "ENDED", label: "종료됨" },
];

const PREVIEW_COUNT = 4;

interface RecentContentSectionProps {
  submissions: SubmissionView[];
}

export function RecentContentSection({ submissions }: RecentContentSectionProps) {
  const [filter, setFilter] = useState<FilterKey>("ALL");

  const counts = useMemo(() => {
    const base: Record<FilterKey, number> = {
      ALL: submissions.length,
      PUBLISHED: 0,
      SCHEDULED: 0,
      PENDING_REVIEW: 0,
      ENDED: 0,
      DRAFT: 0,
      REJECTED: 0,
      APPROVED: 0,
      SUSPENDED: 0,
      CANCELED: 0,
      ARCHIVED: 0,
    };
    for (const submission of submissions) base[submission.status] += 1;
    return base;
  }, [submissions]);

  const filtered = useMemo(
    () =>
      filter === "ALL"
        ? submissions
        : submissions.filter((submission) => submission.status === filter),
    [submissions, filter],
  );

  return (
    <section className="min-w-0 rounded-card border border-line bg-surface p-5 shadow-card">
      <SectionHeader
        title="내 콘텐츠"
        action={
          <Button variant="link" size="sm" asChild>
            <a href="/studio">새 콘텐츠 등록 →</a>
          </Button>
        }
      />

      <Tabs
        value={filter}
        onValueChange={(value) => setFilter(value as FilterKey)}
        className="mt-4 max-w-full"
      >
        {/* 좁은 화면에서 탭이 넘칠 때 가로로 스크롤한다. 페이지는 넘치지 않는다. */}
        <TabsList className="max-w-full overflow-x-auto">
          {filterTabs.map((tab) => (
            <TabsTrigger key={tab.key} value={tab.key}>
              {tab.label}
              <span className="ml-1 text-caption tabular-nums">
                {counts[tab.key]}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {filtered.slice(0, PREVIEW_COUNT).map((submission) => (
          <PosterCard key={submission.id} submission={submission} />
        ))}
      </div>

      {filtered.length === 0 && (
        <EmptyState title="해당 상태의 콘텐츠가 없습니다." />
      )}

      {filtered.length > PREVIEW_COUNT && (
        <p className="mt-4 text-center text-caption text-ink-subtle">
          최근 {PREVIEW_COUNT}건만 표시합니다. 전체 목록과 페이지 이동은 준비 중입니다.
        </p>
      )}
    </section>
  );
}
