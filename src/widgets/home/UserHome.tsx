import {
  ChevronRight,
  CircleCheck,
  MonitorPlay,
  PenLine,
  ShieldCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { useImpressionStats } from "@/entities/impression/api/queries";
import {
  impressionRange,
  indexImpressions,
} from "@/entities/impression/model/types";
import type { ImpressionStatsItem } from "@/entities/impression/model/types";
import { KIND_INFO, fixActionOf, getUserStatus } from "@/entities/submission";
import type {
  SubmissionStatus,
  SubmissionView,
} from "@/entities/submission/model/types";
import {
  useSubmissionSummary,
  useSubmissionViews,
} from "@/features/submissions/api/queries";
import { IconTile, PageState } from "@/shared/components";
import { to } from "@/shared/config/routes";
import { cn } from "@/shared/lib/utils";
import { ActivityFeed } from "./ActivityFeed";
import { RecentStories } from "./RecentStories";
import { UploadChoices } from "./UploadChoices";

/**
 * 사용자 홈 (기획 4-0, 4-1). 게시자가 홈에 오는 이유는 "무엇을 올릴까"라서 올리기
 * 세 종류가 주인공이다. 하우스 관리자 홈(다음 차례)·운영자 홈(TV 화면)과 같은 틀에서
 * 맨 위 칸만 역할의 일로 바뀐다.
 *
 * - 처음(올린 것 0건): 올리기 세 종류와 게시 절차. 빈 "내 컨텐츠" 칸은 그리지 않는다.
 * - 다시 온 사람: 반려·중단된 것이 있으면 올리기 위에 한 줄 알림, 그 아래 올리기 세 종류,
 *   내 컨텐츠 한 줄 표(고칠 것이 맨 위), 옆 칸에 최근 소식과 지금 TV의 제보.
 */
const ACTIVE: readonly SubmissionStatus[] = [
  "REJECTED",
  "SUSPENDED",
  "PENDING_REVIEW",
  "APPROVED",
  "SCHEDULED",
  "PUBLISHED",
];
const PAST: readonly SubmissionStatus[] = ["ENDED", "CANCELED"];
const ACTIVE_LIMIT = 10;
const SHOWN = 6;
const IMPRESSION_DAYS = 365;

/** 고칠 것 → 걸려 있는 것 → 걸릴 것 → 심사 중인 것 */
const ORDER: Partial<Record<SubmissionStatus, number>> = {
  REJECTED: 0,
  SUSPENDED: 0,
  PUBLISHED: 1,
  SCHEDULED: 2,
  APPROVED: 2,
  PENDING_REVIEW: 3,
};

export function UserHome() {
  const summary = useSubmissionSummary("me");
  const active = useSubmissionViews({
    statuses: ACTIVE,
    scope: "me",
    limit: ACTIVE_LIMIT,
  });
  const past = useSubmissionViews({ statuses: PAST, scope: "me", limit: 3 });
  const now = summary.data?.calculatedAt;
  const stats = useImpressionStats(
    now ? impressionRange(IMPRESSION_DAYS, now) : {},
    { enabled: Boolean(now) },
  );

  return (
    <PageState
      isLoading={summary.isPending || active.isPending || past.isPending}
      error={summary.error ?? active.error ?? past.error}
      onRetry={() => {
        void summary.refetch();
        void active.refetch();
        void past.refetch();
      }}
      loadingRows={4}
    >
      {summary.data &&
        active.data &&
        past.data &&
        (summary.data.total === 0 ? (
          <FirstVisit />
        ) : (
          <Returning
            active={active.data.items}
            past={past.data.items}
            impressions={indexImpressions(stats.data)}
            now={active.data.serverTime}
          />
        ))}
    </PageState>
  );
}

function PageTitle() {
  return (
    <div>
      <h1 className="text-[22px] leading-tight font-extrabold tracking-[-0.03em] text-ink">
        무엇을 TV에 올릴까요?
      </h1>
      <p className="mt-1 text-label text-ink-muted">
        심사 후 기숙사 로비 TV에 게시
      </p>
    </div>
  );
}

function FirstVisit() {
  return (
    <>
      <PageTitle />
      <UploadChoices />
      <section
        aria-labelledby="first-flow"
        className="rounded-card bg-surface px-6 pt-5 pb-5 ring-1 ring-line sm:px-7"
      >
        <h2 id="first-flow" className="text-subhead text-ink">
          게시 절차
        </h2>
        <ol className="relative mt-4">
          <span
            aria-hidden="true"
            className="absolute top-5 bottom-6 left-[19px] w-0.5 bg-line"
          />
          <Step icon={PenLine} title="올리기">
            콘텐츠를 작성한 뒤 심사를 요청합니다.
          </Step>
          <Step icon={ShieldCheck} title="하우스 관리자 심사">
            심사 결과와 반려 사유는 상세 화면에서 확인할 수 있습니다. 반려된
            제보는 새로 작성해야 합니다.
          </Step>
          <Step icon={MonitorPlay} title="TV에 게시">
            게시 기간 동안 TV에 순환 표시됩니다. 노출 횟수는 내 콘텐츠에서
            확인할 수 있습니다.
          </Step>
          <Step icon={CircleCheck} title="게시 종료" last>
            게시 기간이 끝나면 자동 종료됩니다.
          </Step>
        </ol>
      </section>
    </>
  );
}

function Step({
  icon,
  title,
  last = false,
  children,
}: {
  icon: LucideIcon;
  title: string;
  last?: boolean;
  children: ReactNode;
}) {
  return (
    <li className={cn("relative flex gap-4", !last && "pb-4.5")}>
      <IconTile
        icon={icon}
        size="md"
        className="rounded-full bg-surface-muted text-ink-muted ring-2 ring-surface"
      />
      <div>
        <b className="text-ink">{title}</b>
        <p className="text-label text-ink-muted">{children}</p>
      </div>
    </li>
  );
}

function Returning({
  active,
  past,
  impressions,
  now,
}: {
  active: SubmissionView[];
  past: SubmissionView[];
  impressions: Map<string, ImpressionStatsItem>;
  now: Date;
}) {
  const ordered = [...active].sort(
    (a, b) => (ORDER[a.status] ?? 9) - (ORDER[b.status] ?? 9),
  );
  const returned = ordered.filter((item) => fixActionOf(item) !== null);
  const shown = (ordered.length > 0 ? ordered : past).slice(0, SHOWN);

  return (
    <>
      <PageTitle />

      {returned.length > 0 && (
        // 올리기가 주인공이라 고칠 것은 한 줄 알림으로 두고, 고치는 길은 아래 표에 둔다.
        <a
          href="#my-contents"
          className="flex items-center gap-2.5 rounded-control bg-surface px-4 py-3 ring-1 ring-accent-300 transition-colors hover:bg-danger-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          <span
            aria-hidden="true"
            className="size-1.75 shrink-0 rounded-full bg-accent"
          />
          <b className="shrink-0 text-accent-700">
            고칠 콘텐츠 {returned.length}건
          </b>
          <span className="hidden min-w-0 flex-1 truncate text-ink-muted sm:block">
            {returned.map((item) => item.title).join(" · ")}
          </span>
          <span className="ml-auto inline-flex shrink-0 items-center text-label font-semibold text-accent-700">
            확인하기
            <ChevronRight size={15} aria-hidden="true" />
          </span>
        </a>
      )}

      <UploadChoices />

      <div className="mt-2 flex flex-wrap items-start gap-5">
        <section
          id="my-contents"
          aria-labelledby="mine"
          className="min-w-0 flex-[999_1_560px] scroll-mt-24 overflow-hidden rounded-card bg-surface ring-1 ring-line"
        >
          <div className="flex items-center border-b border-line px-5 py-3.5">
            <h2 id="mine" className="text-subhead text-ink">
              내 콘텐츠
            </h2>
            <Link
              to={to.mine()}
              className="ml-auto inline-flex items-center text-label text-ink-muted hover:text-ink"
            >
              모두 보기
              <ChevronRight size={15} aria-hidden="true" />
            </Link>
          </div>
          <ul>
            {shown.map((item) => (
              <MineRow
                key={item.id}
                item={item}
                impressions={impressions.get(item.id)}
                now={now}
              />
            ))}
          </ul>
        </section>

        <aside className="flex min-w-0 flex-[1_1_300px] flex-col gap-5">
          <ActivityFeed submissions={[...active, ...past]} now={now} />
          <RecentStories />
        </aside>
      </div>
    </>
  );
}

/**
 * 내 콘텐츠 한 줄. 상태는 색을 아껴 쓴다: 고칠 것만 빨강, 게시 중은 초록 점, 나머지는
 * 회색 글. 오른쪽 칸은 고칠 것이면 고치러 가는 길, 아니면 짧은 진행 정보다.
 */
function MineRow({
  item,
  impressions,
  now,
}: {
  item: SubmissionView;
  impressions: ImpressionStatsItem | undefined;
  now: Date;
}) {
  const status = getUserStatus(item, now);
  const fix = fixActionOf(item);
  const kind = KIND_INFO[item.type].name;
  const note =
    impressions && item.status === "PUBLISHED"
      ? `TV 노출 ${impressions.impressions.toLocaleString("ko-KR")}번`
      : status.note;
  const statusLabel = (
    <span
      className={cn(
        "inline-flex items-center gap-1.5",
        status.tone === "problem"
          ? "font-semibold text-accent-700"
          : status.tone === "live"
            ? "text-ink"
            : "text-ink-muted",
      )}
    >
      {status.tone === "live" && (
        <span aria-hidden="true" className="size-1.5 rounded-full bg-success" />
      )}
      {status.label}
    </span>
  );

  return (
    <li className="flex items-center gap-3 border-t border-surface-muted px-5 py-3 first:border-t-0">
      <div className="min-w-0 flex-1">
        <Link
          to={to.submissionDetail(item.id)}
          className="block truncate font-semibold text-ink underline-offset-4 hover:underline"
        >
          {item.title}
        </Link>
        <p className="text-caption text-ink-subtle sm:hidden">
          {kind} · {statusLabel}
        </p>
      </div>
      <span className="hidden w-24 shrink-0 text-label text-ink-muted sm:block">
        {kind}
      </span>
      <span className="hidden w-24 shrink-0 text-label sm:block">
        {statusLabel}
      </span>
      <span className="shrink-0 text-right text-label sm:w-36">
        {fix ? (
          <Link
            to={fix.href}
            className="inline-flex items-center font-bold text-accent-700 hover:underline"
          >
            {fix.label}
            <ChevronRight size={15} aria-hidden="true" />
          </Link>
        ) : (
          <span className="text-ink-muted">{note}</span>
        )}
      </span>
    </li>
  );
}
