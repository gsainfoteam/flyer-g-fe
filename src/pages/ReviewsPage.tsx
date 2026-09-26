import { useMemo } from "react";
import { Link, useSearchParams } from "react-router";
import { to } from "@/app/router/routes";
import { SubmissionRow } from "@/components/common/SubmissionRow";
import { getStatusSentence } from "@/entities/submission";
import type { SubmissionView } from "@/entities/submission/model/types";
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
 * 오래 기다린 순이 기본이다. 기다린 시간은 초안을 만든 때가 아니라 마지막으로
 * 검토에 낸 때부터 센다.
 *
 * 조직·카테고리 필터는 URL에 남겨 새로고침·공유에도 유지한다. 필터는 불러온
 * 건 안에서 거른다 — 대기 목록은 수십 건 규모이고 서버 필터의 식별자 체계가
 * 아직 미확정이다. 더 불러올 것이 남아 있으면 그 사실을 함께 알린다.
 * (`API-REQUIREMENTS.md` 6.1)
 */
const ALL = "__all__";
const ORGANIZATION_PARAM = "organization";
const CATEGORY_PARAM = "category";
/** 조직명이 빈 신청(개인 작성). Select는 빈 문자열 값을 쓸 수 없다. */
const NO_ORGANIZATION = "__none__";

const organizationKey = (item: SubmissionView) =>
  item.organizationName || NO_ORGANIZATION;

export function ReviewsPage() {
  const pending = useInfinitePendingReviews();
  const [searchParams, setSearchParams] = useSearchParams();
  const organization = searchParams.get(ORGANIZATION_PARAM) ?? ALL;
  const category = searchParams.get(CATEGORY_PARAM) ?? ALL;

  const items = useMemo(() => pending.data?.items ?? [], [pending.data]);

  const organizations = useMemo(
    () => [...new Set(items.map(organizationKey))].sort(),
    [items],
  );
  const categories = useMemo(
    () => [...new Set(items.map((item) => item.categoryName))].sort(),
    [items],
  );

  const filtered = items.filter(
    (item) =>
      (organization === ALL || organizationKey(item) === organization) &&
      (category === ALL || item.categoryName === category),
  );

  const isFiltered = organization !== ALL || category !== ALL;

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
                value={organization}
                onValueChange={(value) => setFilter(ORGANIZATION_PARAM, value)}
              >
                <SelectTrigger
                  size="sm"
                  aria-label="조직 필터"
                  className="min-w-33"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>모든 조직</SelectItem>
                  {organizations.map((key) => (
                    <SelectItem key={key} value={key}>
                      {key === NO_ORGANIZATION ? "조직 없음" : key}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

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
              <ul className="flex flex-col divide-y divide-line">
                {filtered.map((submission, index) => {
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
                        submission.organizationName,
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
                {isFiltered && (
                  <p className="mb-2 text-caption text-ink-muted">
                    불러온 {items.length}건 안에서 거른 결과예요. 더 불러오면
                    나머지도 함께 걸러요.
                  </p>
                )}
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
