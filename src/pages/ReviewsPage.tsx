import { useMemo, useState } from "react";
import { Link } from "react-router";
import { to } from "@/app/router/routes";
import { SubmissionRow } from "@/components/common/SubmissionRow";
import { getStatusSentence } from "@/entities/submission";
import { usePendingReviews } from "@/features/reviews/api/queries";
import { EmptyState, PageState, Panel } from "@/shared/components";
import { formatElapsed, formatSeoulDateTime } from "@/shared/lib/datetime";
import { Button } from "@/shared/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";

/**
 * 승인 대기 목록 (명세 FR-REV-01).
 *
 * 오래 기다린 순이 기본이다. 관리자가 먼저 처리해야 하는 건이 위로 온다.
 *
 * 조직·카테고리 필터는 현재 클라이언트에서 거른다. 대기 목록은 수십 건 규모라
 * 전체를 받아 거르는 편이 단순하고, 서버 필터 식별자 체계가 아직 미확정이다.
 * 규모가 커지면 서버 필터로 옮긴다. (`API-REQUIREMENTS.md` 6.1)
 */
const ALL = "__all__";

export function ReviewsPage() {
  const pending = usePendingReviews(100);
  const [organization, setOrganization] = useState(ALL);
  const [category, setCategory] = useState(ALL);

  const items = useMemo(() => pending.data?.items ?? [], [pending.data]);

  const organizations = useMemo(
    () => [...new Set(items.map((item) => item.organizationName))].sort(),
    [items],
  );
  const categories = useMemo(
    () => [...new Set(items.map((item) => item.categoryName))].sort(),
    [items],
  );

  const filtered = items.filter(
    (item) =>
      (organization === ALL || item.organizationName === organization) &&
      (category === ALL || item.categoryName === category),
  );

  const now = pending.data?.serverTime ?? new Date();
  const isFiltered = organization !== ALL || category !== ALL;

  return (
    <PageState
      isLoading={pending.isPending}
      error={pending.error}
      onRetry={() => void pending.refetch()}
      loadingRows={6}
    >
      {pending.data && (
        <>
          <div className="flex flex-wrap items-end gap-6">
            <div className="min-w-0 flex-1">
              <h1 className="text-display text-ink">
                승인 대기 {pending.data.totalCount}건
              </h1>
              <p className="mt-1.5 text-label text-ink-muted">
                오래 기다린 순서로 보여드려요.{" "}
                {formatSeoulDateTime(pending.data.serverTime)} 기준.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Select value={organization} onValueChange={setOrganization}>
                <SelectTrigger
                  size="sm"
                  aria-label="조직 필터"
                  className="min-w-[132px]"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>모든 조직</SelectItem>
                  {organizations.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger
                  size="sm"
                  aria-label="카테고리 필터"
                  className="min-w-[132px]"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>모든 카테고리</SelectItem>
                  {categories.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Panel flush>
            {filtered.length === 0 ? (
              <EmptyState
                title={
                  isFiltered
                    ? "조건에 맞는 대기 건이 없어요"
                    : "처리할 신청이 없어요"
                }
                description={
                  isFiltered
                    ? "필터를 넓혀 보세요."
                    : "새 신청이 들어오면 여기에 가장 먼저 보여드려요."
                }
                className="px-3"
              />
            ) : (
              <ul className="flex flex-col">
                {filtered.map((submission, index) => {
                  const waited = formatElapsed(submission.createdAt, now);
                  const urgent = !isFiltered && index === 0;
                  return (
                    <SubmissionRow
                      key={submission.id}
                      submission={submission}
                      highlighted={urgent}
                      thumbSize="md"
                      className={index > 0 ? "border-t border-line" : undefined}
                      sentence={`${submission.organizationName} · ${
                        submission.categoryName
                      } · ${getStatusSentence({
                        status: submission.status,
                        waitingLabel: waited,
                      })}`}
                      trailing={
                        <>
                          <span
                            className={
                              urgent
                                ? "shrink-0 text-label font-bold text-attention-strong"
                                : "shrink-0 text-label text-ink-subtle"
                            }
                          >
                            {waited} 대기
                          </span>
                          <Button variant="secondary" size="sm" asChild>
                            <Link to={to.reviewDetail(submission.id)}>
                              검토
                            </Link>
                          </Button>
                        </>
                      }
                    />
                  );
                })}
              </ul>
            )}
          </Panel>
        </>
      )}
    </PageState>
  );
}
