import { Link, useSearchParams } from "react-router";
import { fromSubmissionView } from "@/entities/poster";
import { PosterThumb } from "@/entities/poster/ui/PosterThumb";
import { useImpressionStats } from "@/entities/impression/api/queries";
import {
  impressionRange,
  indexImpressions,
} from "@/entities/impression/model/types";
import type { ImpressionStatsItem } from "@/entities/impression/model/types";
import {
  KIND_INFO,
  canSubmitterResubmit,
  formatPeriod,
  getUserStatus,
  kindOfSubmission,
} from "@/entities/submission";
import type {
  SubmissionStatus,
  SubmissionView,
} from "@/entities/submission/model/types";
import { USER_STATUS_TEXT } from "@/entities/submission/ui/user-status-style";
import {
  useInfiniteSubmissionViews,
  useSubmissionSummary,
} from "@/features/submissions/api/queries";
import { EmptyState, PageState } from "@/shared/components";
import { to } from "@/shared/config/routes";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Spinner } from "@/shared/ui/spinner";

/**
 * 내 컨텐츠 (기획 4-1).
 *
 * 사용자는 올린 것이 몇 건 없다고 보고, 탭은 전체 · 진행 중 · 지난 것 셋만 둔다.
 * 넓은 화면은 한 줄 표(컨텐츠·상태·기간·TV 노출·할 일), 좁은 화면은 줄 목록이다.
 * 반려·중단된 건은 할 일 칸에 "고쳐서 다시 내기"를 굵게 둔다.
 */
const VIEW_PARAM = "view";

const ACTIVE: readonly SubmissionStatus[] = [
  "DRAFT",
  "PENDING_REVIEW",
  "REJECTED",
  "APPROVED",
  "SCHEDULED",
  "PUBLISHED",
  "SUSPENDED",
];
const PAST: readonly SubmissionStatus[] = ["ENDED", "CANCELED"];

const VIEWS = [
  { key: "all", label: "전체", statuses: [...ACTIVE, ...PAST] },
  { key: "active", label: "진행 중", statuses: ACTIVE },
  { key: "past", label: "지난 것", statuses: PAST },
] as const;
type ViewKey = (typeof VIEWS)[number]["key"];

/** 지난 컨텐츠의 노출까지 보려고 1년을 묻는다(서버 최대 366일). */
const IMPRESSION_DAYS = 365;

export function MinePage() {
  const [params, setParams] = useSearchParams();
  const view = VIEWS.find((v) => v.key === params.get(VIEW_PARAM)) ?? VIEWS[0];

  const summary = useSubmissionSummary("me");
  const list = useInfiniteSubmissionViews(view.statuses, "me");
  const now = summary.data?.calculatedAt;
  const stats = useImpressionStats(
    now ? impressionRange(IMPRESSION_DAYS, now) : {},
    { enabled: Boolean(now) },
  );
  const impressions = indexImpressions(stats.data);

  const counts = summary.data ? countViews(summary.data.byStatus) : undefined;
  const items = list.data?.items ?? [];

  const select = (key: ViewKey) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (key === "all") next.delete(VIEW_PARAM);
        else next.set(VIEW_PARAM, key);
        return next;
      },
      { replace: true },
    );

  return (
    <>
      <div className="flex flex-wrap items-end gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-title text-ink">내 컨텐츠</h1>
          <p className="mt-1 text-label text-ink-muted">
            {counts
              ? `진행 중 ${counts.active} · 지난 것 ${counts.past}`
              : "불러오는 중"}
          </p>
        </div>
        <Button asChild>
          <Link to={to.home()}>새로 올리기</Link>
        </Button>
      </div>

      <div
        role="tablist"
        aria-label="보기"
        className="-mt-1 flex gap-6 border-b border-line text-label"
      >
        {VIEWS.map((item) => {
          const selected = item.key === view.key;
          return (
            <button
              key={item.key}
              type="button"
              role="tab"
              id={`mine-tab-${item.key}`}
              aria-selected={selected}
              aria-controls="mine-list"
              onClick={() => select(item.key)}
              className={cn(
                "-mb-px border-b-2 py-2.5 transition-colors",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
                selected
                  ? "border-ink font-bold text-ink"
                  : "border-transparent text-ink-muted hover:text-ink",
              )}
            >
              {item.label}
              {counts && (
                <span className="tabular-nums"> {counts[item.key]}</span>
              )}
            </button>
          );
        })}
      </div>

      <div
        id="mine-list"
        role="tabpanel"
        aria-labelledby={`mine-tab-${view.key}`}
      >
        <PageState
          isLoading={list.isPending}
          error={list.error}
          onRetry={() => void list.refetch()}
          loadingRows={5}
        >
          {list.data &&
            (items.length === 0 ? (
              <EmptyState
                title={
                  view.key === "past"
                    ? "아직 지난 컨텐츠가 없어요"
                    : "아직 올린 컨텐츠가 없어요"
                }
                description="홈에서 포스터를 골라 첫 컨텐츠를 올려 보세요."
                action={
                  <Button variant="secondary" size="sm" asChild>
                    <Link to={to.home()}>올리러 가기</Link>
                  </Button>
                }
              />
            ) : (
              <>
                <MineTable
                  items={items}
                  impressions={impressions}
                  now={list.data.serverTime}
                />
                <MineList
                  items={items}
                  impressions={impressions}
                  now={list.data.serverTime}
                />
                {list.hasNextPage && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="mt-3 w-full"
                    disabled={list.isFetchingNextPage}
                    onClick={() => void list.fetchNextPage()}
                  >
                    {list.isFetchingNextPage && <Spinner aria-hidden="true" />}
                    더 보기 ({items.length} / {list.data.totalCount})
                  </Button>
                )}
              </>
            ))}
        </PageState>
        <p className="mt-3 text-caption text-ink-subtle">
          TV 노출은 TV가 화면에 띄운 횟수(최근 1년)예요.
        </p>
      </div>
    </>
  );
}

interface RowsProps {
  items: SubmissionView[];
  impressions: Map<string, ImpressionStatsItem>;
  now: Date;
}

/** 넓은 화면의 한 줄 표 */
function MineTable({ items, impressions, now }: RowsProps) {
  return (
    <div className="hidden overflow-x-auto rounded-card border border-line bg-surface md:block">
      <table className="w-full min-w-[820px] border-collapse text-label">
        <thead>
          <tr className="text-left text-caption text-ink-subtle">
            <th scope="col" className="px-5 py-2.5 font-medium">
              컨텐츠
            </th>
            <th scope="col" className="w-48 px-2 py-2.5 font-medium">
              상태
            </th>
            <th scope="col" className="w-40 px-2 py-2.5 font-medium">
              기간
            </th>
            <th scope="col" className="w-28 px-2 py-2.5 font-medium">
              TV 노출
            </th>
            <th scope="col" className="w-36 px-5 py-2.5">
              <span className="sr-only">할 일</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const status = getUserStatus(item, now);
            const action = actionOf(item);
            return (
              <tr key={item.id} className="border-t border-surface-muted">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3.5">
                    <PosterThumb poster={fromSubmissionView(item)} size="sm" />
                    <div className="min-w-0">
                      <p className="text-caption text-ink-subtle">
                        {KIND_INFO[kindOfSubmission(item)].name}
                      </p>
                      <Link
                        to={to.submissionDetail(item.id)}
                        className="block truncate font-bold text-ink hover:underline focus-visible:outline-2 focus-visible:outline-focus"
                      >
                        {item.title}
                      </Link>
                    </div>
                  </div>
                </td>
                <td className="px-2 py-3">
                  <span
                    className={cn("font-semibold", USER_STATUS_TEXT[status.tone])}
                  >
                    {status.label}
                  </span>
                  {status.note && (
                    <p className="text-caption text-ink-subtle">{status.note}</p>
                  )}
                </td>
                <td className="px-2 py-3 text-ink-muted">{formatPeriod(item)}</td>
                <td className="px-2 py-3 text-ink-muted tabular-nums">
                  {impressionLabel(impressions.get(item.id))}
                </td>
                <td className="px-5 py-3 text-right whitespace-nowrap">
                  <Link
                    to={action.href}
                    className={cn(
                      "text-label text-ink underline-offset-4 hover:underline",
                      action.strong && "font-bold text-accent-700",
                    )}
                  >
                    {action.label}
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** 좁은 화면의 줄 목록. 줄 전체가 상세로 가는 링크다. */
function MineList({ items, impressions, now }: RowsProps) {
  return (
    <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-card border border-line bg-surface md:hidden">
      {items.map((item) => {
        const status = getUserStatus(item, now);
        const action = actionOf(item);
        const views = impressionLabel(impressions.get(item.id));
        return (
          <li key={item.id}>
            <Link
              to={action.strong ? action.href : to.submissionDetail(item.id)}
              className="flex items-center gap-3.5 px-4 py-3.5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
            >
              <PosterThumb poster={fromSubmissionView(item)} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-caption text-ink-subtle">
                  {KIND_INFO[kindOfSubmission(item)].name} · {formatPeriod(item)}
                </p>
                <p className="truncate font-bold text-ink">{item.title}</p>
                <p className="text-caption text-ink-muted">
                  <span
                    className={cn("font-semibold", USER_STATUS_TEXT[status.tone])}
                  >
                    {status.label}
                  </span>
                  {status.note && ` · ${status.note}`}
                  {views !== "—" && ` · 노출 ${views}`}
                </p>
              </div>
              {action.strong && (
                <span className="shrink-0 text-caption font-bold text-accent-700">
                  {action.label}
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function actionOf(item: SubmissionView): {
  label: string;
  href: string;
  strong: boolean;
} {
  if (item.status === "REJECTED" || item.status === "SUSPENDED") {
    if (canSubmitterResubmit(item.status)) {
      return {
        label: "고쳐서 다시 내기",
        href: to.editPoster(item.id),
        strong: true,
      };
    }
  }
  return { label: "상세", href: to.submissionDetail(item.id), strong: false };
}

function impressionLabel(item: ImpressionStatsItem | undefined): string {
  return item ? item.impressions.toLocaleString("ko-KR") : "—";
}

function countViews(
  byStatus: Record<SubmissionStatus, number>,
): Record<ViewKey, number> {
  const sum = (statuses: readonly SubmissionStatus[]) =>
    statuses.reduce((total, status) => total + (byStatus[status] ?? 0), 0);
  const active = sum(ACTIVE);
  const past = sum(PAST);
  return { all: active + past, active, past };
}
