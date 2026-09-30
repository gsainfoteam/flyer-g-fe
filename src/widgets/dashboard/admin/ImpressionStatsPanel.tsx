import { useState } from "react";
import { Link } from "react-router";
import { useImpressionStats } from "@/entities/impression/api/queries";
import {
  impressionRange,
  totalImpressions,
} from "@/entities/impression/model/types";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  Panel,
} from "@/shared/components";
import { to } from "@/shared/config/routes";
import { getSeoulParts } from "@/shared/lib/datetime";
import { cn } from "@/shared/lib/utils";

/**
 * 노출 통계. 운영자가 게시판이 실제로 얼마나 돌았는지 본다.
 *
 * 노출은 TV가 포스터를 정상으로 띄운 횟수다. 사람이 본 횟수가 아니라는 것을 표
 * 아래에 늘 적는다. 기간은 오늘·7일·30일 중에서 고른다. 서버는 10분마다 모으므로
 * 마지막으로 모은 시각을 함께 둔다.
 */
const PERIODS = [
  { key: "today", label: "오늘", days: 1 },
  { key: "week", label: "7일", days: 7 },
  { key: "month", label: "30일", days: 30 },
] as const;
type PeriodKey = (typeof PERIODS)[number]["key"];

/** 처음에 보여줄 줄 수. 나머지는 펼친다. */
const TOP_ROWS = 5;

const count = (value: number) => value.toLocaleString("ko-KR");

export function ImpressionStatsPanel({ now }: { now: Date }) {
  const [periodKey, setPeriodKey] = useState<PeriodKey>("week");
  const [expanded, setExpanded] = useState(false);
  const period = PERIODS.find((item) => item.key === periodKey)!;
  const stats = useImpressionStats({
    ...impressionRange(period.days, now),
    scope: "all",
  });

  const items = stats.data?.items ?? [];
  const shown = expanded ? items : items.slice(0, TOP_ROWS);
  const total = totalImpressions(items);
  const top = items[0]?.impressions ?? 0;

  return (
    <Panel
      title="노출 통계"
      action={
        <div
          role="group"
          aria-label="기간"
          className="inline-flex gap-0.5 rounded-control bg-surface-muted p-0.5"
        >
          {PERIODS.map((item) => (
            <button
              key={item.key}
              type="button"
              aria-pressed={item.key === periodKey}
              onClick={() => {
                setPeriodKey(item.key);
                setExpanded(false);
              }}
              className={cn(
                "h-7 rounded-[8px] px-3 text-caption font-semibold transition-colors",
                "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus",
                item.key === periodKey
                  ? "bg-surface text-ink shadow-card"
                  : "text-ink-muted hover:text-ink",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      }
      flush
      bodyClassName="p-0"
    >
      {stats.isPending ? (
        <LoadingState
          rows={3}
          label="노출 통계를 불러오고 있어요."
          className="px-5 py-4"
        />
      ) : stats.error ? (
        <ErrorState
          error={stats.error}
          title="노출 통계를 불러오지 못했어요"
          onRetry={() => void stats.refetch()}
          className="px-5"
        />
      ) : items.length === 0 ? (
        <EmptyState
          title="이 기간에 TV에 나온 포스터가 없어요"
          description="기간을 늘려 보세요."
          className="px-5"
        />
      ) : (
        <>
          <dl className="flex flex-wrap gap-x-10 gap-y-3 border-b border-line px-5 py-4">
            <Figure label="전체 노출" value={`${count(total)}회`} />
            <Figure label="나온 포스터" value={`${items.length}건`} />
          </dl>
          <table className="w-full table-fixed text-label">
            <thead>
              <tr className="border-b border-line text-left text-caption text-ink-subtle">
                <th scope="col" className="px-5 py-2.5 font-semibold">
                  포스터
                </th>
                <th
                  scope="col"
                  className="w-56 px-5 py-2.5 text-right font-semibold max-md:w-28"
                >
                  노출
                </th>
                <th
                  scope="col"
                  className="w-18 px-5 py-2.5 text-right font-semibold max-sm:hidden"
                >
                  TV
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/70">
              {shown.map((item) => (
                <tr key={item.submissionId}>
                  <td className="px-5 py-2.5">
                    <Link
                      to={to.submissionDetail(item.submissionId)}
                      className="block truncate font-semibold text-ink hover:underline"
                    >
                      {item.title}
                    </Link>
                  </td>
                  <td className="px-5 py-2.5">
                    <div className="flex items-center justify-end gap-3">
                      <div
                        aria-hidden="true"
                        className="h-1.5 w-28 shrink-0 overflow-hidden rounded-pill bg-surface-muted max-md:hidden"
                      >
                        <div
                          className="h-full rounded-pill bg-ink-muted"
                          style={{
                            width: `${top > 0 ? (item.impressions / top) * 100 : 0}%`,
                          }}
                        />
                      </div>
                      <span className="w-14 text-right font-bold tabular-nums">
                        {count(item.impressions)}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-2.5 text-right tabular-nums max-sm:hidden">
                    {item.deviceCount}대
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-line px-5 py-3">
            <p className="text-caption text-ink-subtle">
              TV가 포스터를 띄운 횟수예요. 사람이 본 횟수가 아니에요.
              {stats.data.aggregatedAt &&
                ` · ${timeOf(stats.data.aggregatedAt)} 집계`}
            </p>
            {items.length > TOP_ROWS && (
              <button
                type="button"
                aria-expanded={expanded}
                onClick={() => setExpanded((value) => !value)}
                className="text-caption font-semibold text-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                {expanded ? "접기" : `나머지 ${items.length - TOP_ROWS}건 보기`}
              </button>
            )}
          </div>
        </>
      )}
    </Panel>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col-reverse">
      <dt className="mt-1 text-caption text-ink-subtle">{label}</dt>
      <dd className="text-[22px] leading-tight font-extrabold tracking-tight text-ink tabular-nums">
        {value}
      </dd>
    </div>
  );
}

function timeOf(date: Date): string {
  const { hour24, minute } = getSeoulParts(date);
  return `${String(hour24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}
