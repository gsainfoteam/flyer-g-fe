import { Link, useSearchParams } from "react-router";
import { to } from "@/shared/config/routes";
import { SubmissionRow } from "@/entities/submission/ui/SubmissionRow";
import { getStatusSentence } from "@/entities/submission";
import { useCategories } from "@/entities/submission/api/queries";
import { useInfinitePendingReviews } from "@/features/reviews/api/queries";
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
import { Spinner } from "@/shared/ui/spinner";

/**
 * 승인 대기 목록 (명세 FR-REV-01).
 *
 * 오래 기다린 순이 기본이다. 기다린 시간은 처음 만든 때가 아니라 마지막으로
 * 검토에 낸 때부터 센다.
 *
 * 카테고리 필터는 URL에 남겨 새로고침·공유에도 유지하고, 서버가 거른다.
 * 조직 필터는 없다 — 서버에 조직 모델이 없고 주최는 자유 입력이다.
 * (`API-CHANGES-BACKEND.md` 6.1)
 */
const ALL = "__all__";
const CATEGORY_PARAM = "category";

export function ReviewsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const category = searchParams.get(CATEGORY_PARAM) ?? ALL;
  const categories = useCategories();
  const pending = useInfinitePendingReviews(category === ALL ? null : category);

  const items = pending.data?.items ?? [];

  const isFiltered = category !== ALL;

  const setFilter = (param: string, value: string) => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value === ALL) next.delete(param);
        else next.set(param, value);
        return next;
      },
      { replace: true },
    );
  };

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
              <Select
                value={category}
                onValueChange={(value) => setFilter(CATEGORY_PARAM, value)}
              >
                <SelectTrigger
                  size="sm"
                  aria-label="카테고리 필터"
                  className="min-w-33"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>모든 카테고리</SelectItem>
                  {(categories.data ?? []).map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Panel flush>
            {items.length === 0 ? (
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
              <ul className="flex flex-col divide-y divide-line">
                {items.map((submission, index) => {
                  const waited = formatElapsed(
                    submission.submittedAt ?? submission.createdAt,
                    pending.data.serverTime,
                  );
                  const urgent = !isFiltered && index === 0;
                  return (
                    <SubmissionRow
                      key={submission.id}
                      submission={submission}
                      highlighted={urgent}
                      thumbSize="md"
                      sentence={[
                        submission.requesterName,
                        submission.organizerName,
                        submission.categoryName,
                        getStatusSentence({
                          status: submission.status,
                          waitingLabel: waited,
                        }),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
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

            {pending.hasNextPage && (
              <div className="border-t border-line p-3">
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  disabled={pending.isFetchingNextPage}
                  onClick={() => void pending.fetchNextPage()}
                >
                  {pending.isFetchingNextPage && <Spinner aria-hidden="true" />}
                  더 보기 ({items.length} / {pending.data.totalCount})
                </Button>
              </div>
            )}
          </Panel>
        </>
      )}
    </PageState>
  );
}
