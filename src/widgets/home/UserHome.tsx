import { CircleCheck, MonitorPlay, PenLine, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { useImpressionStats } from "@/entities/impression/api/queries";
import {
  impressionRange,
  indexImpressions,
} from "@/entities/impression/model/types";
import type { ImpressionStatsItem } from "@/entities/impression/model/types";
import {
  KIND_INFO,
  fixActionOf,
  formatPeriod,
  getUserStatus,
} from "@/entities/submission";
import type {
  SubmissionStatus,
  SubmissionView,
} from "@/entities/submission/model/types";
import { USER_STATUS_TEXT } from "@/entities/submission/ui/user-status-style";
import { SubmissionThumb } from "@/entities/submission/ui/SubmissionThumb";
import { useSessionUser } from "@/features/auth/model/auth-context";
import {
  useSubmissionSummary,
  useSubmissionViews,
} from "@/features/submissions/api/queries";
import { HeroPanel, IconTile, PageState } from "@/shared/components";
import { to } from "@/shared/config/routes";
import { cn } from "@/shared/lib/utils";
import { ActivityFeed } from "./ActivityFeed";
import { RecentStories } from "./RecentStories";
import { UploadChoicesLarge, UploadChoicesStrip } from "./UploadChoices";

/**
 * 사용자 홈 (기획 4-0, 4-1).
 *
 * - 처음(올린 것 0건): "무엇을 TV에 띄워 볼까요?" 세 종류를 크게, 진행 순서 4단계.
 *   빈 "내 컨텐츠" 칸은 그리지 않는다.
 * - 다시 온 사람: 반려·중단된 것이 있으면 맨 위 어두운 카드("고칠 콘텐츠"), 올리기 세
 *   종류는 한 줄, 내 컨텐츠 진행 상황, 옆 칸에 최근 소식과 지금 TV의 제보.
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
const SHOWN = 4;
const IMPRESSION_DAYS = 365;

/** 걸려 있는 것 → 걸릴 것 → 심사 중인 것. 고칠 것은 위 카드에 따로 모은다. */
const ORDER: Partial<Record<SubmissionStatus, number>> = {
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

function FirstVisit() {
  const user = useSessionUser();
  return (
    <>
      <div>
        <p className="text-body font-bold text-accent">
          {user.displayName}님의 콘텐츠
        </p>
        <h1 className="mt-1 text-[2rem] leading-tight font-black tracking-[-0.04em] text-ink sm:text-[2.25rem]">
          콘텐츠 올리기
        </h1>
      </div>
      <UploadChoicesLarge />
      <div className="flex flex-wrap items-stretch gap-5">
        <section
          aria-labelledby="first-flow"
          className="min-w-0 flex-[1.2_1_440px] rounded-block bg-surface px-7 pt-7 pb-6 ring-1 ring-line"
        >
          <h2 id="first-flow" className="text-heading text-ink">
            게시 절차
          </h2>
          <ol className="relative mt-5">
            <span
              aria-hidden="true"
              className="absolute top-5 bottom-6 left-[19px] w-0.5 bg-line"
            />
            <Step icon={PenLine} title="올리기">
              콘텐츠를 작성한 뒤 심사를 요청합니다.
            </Step>
            <Step icon={ShieldCheck} title="하우스 관리자 심사">
              심사 결과와 반려 사유는 상세 화면에서 확인할 수 있습니다. 반려된 제보는 새로 작성해야 합니다.
            </Step>
            <Step icon={MonitorPlay} title="TV에 게시">
              게시 기간 동안 TV에 순환 표시됩니다. 노출 횟수는 내 콘텐츠에서 확인할 수 있습니다.
            </Step>
            <Step icon={CircleCheck} title="게시 종료" last>
              게시 기간이 끝나면 자동 종료됩니다.
            </Step>
          </ol>
        </section>
      </div>
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
        className="rounded-full bg-accent-100 text-accent-700 ring-2 ring-accent-200"
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
  // 반려·중단 건은 맨 위 "고칠 콘텐츠"에 모으고 아래 목록에서는 뺀다.
  const returned = active.filter((item) => fixActionOf(item) !== null);
  const rest = active
    .filter((item) => fixActionOf(item) === null)
    .sort((a, b) => (ORDER[a.status] ?? 9) - (ORDER[b.status] ?? 9));
  const shown = (rest.length > 0 ? rest : past).slice(0, SHOWN);
  // 화면의 첫 제목(h1)은 지금 할 일이다. 고칠 것이 없으면 올리기가 할 일이다.
  const UploadHeading = returned.length > 0 ? "h2" : "h1";

  return (
    <>
      {returned.length > 0 && <FixHero items={returned} now={now} />}

      <section aria-labelledby="upload" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <UploadHeading
            id="upload"
            className={cn(
              "text-ink",
              returned.length > 0 ? "text-heading" : "text-title",
            )}
          >
            콘텐츠 올리기
          </UploadHeading>
          <p className="text-label text-ink-muted">
            심사 후 기숙사 로비 TV에 게시
          </p>
        </div>
        <UploadChoicesStrip />
      </section>

      <div className="flex flex-wrap items-start gap-5">
        <section
          aria-labelledby="mine"
          className="min-w-0 flex-[999_1_560px] rounded-block bg-surface py-2 ring-1 ring-line"
        >
          <div className="flex items-baseline px-5 pt-3.5 pb-2 sm:px-6">
            <h2 id="mine" className="text-subhead text-ink">
              내 콘텐츠
            </h2>
            <Link
              to={to.mine()}
              className="ml-auto text-label font-semibold text-ink hover:underline"
            >
              모두 보기
            </Link>
          </div>
          {shown.length === 0 ? (
            <p className="border-t border-surface-muted px-5 py-4 text-label text-ink-muted sm:px-6">
              고칠 콘텐츠 말고는 진행 중인 것 없음
            </p>
          ) : (
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
          )}
        </section>

        <aside className="flex min-w-0 flex-[1_1_300px] flex-col gap-5">
          <ActivityFeed submissions={[...active, ...past]} now={now} />
          <RecentStories />
        </aside>
      </div>
    </>
  );
}

const FIX_SHOWN = 3;

/**
 * 반려·게시 중단된 콘텐츠. 다시 온 사람이 가장 먼저 해야 할 일이라 홈 맨 위의 어두운
 * 카드에 둔다. 사유는 상세에만 있어서 줄마다 사유로 가는 길과 고치러 가는 길을 함께 둔다.
 */
function FixHero({ items, now }: { items: SubmissionView[]; now: Date }) {
  const shown = items.slice(0, FIX_SHOWN);
  const more = items.length - shown.length;
  return (
    <HeroPanel labelledBy="fix-title">
      <h1 id="fix-title" className="flex items-baseline gap-2 text-heading">
        고칠 콘텐츠
        <span className="font-black text-accent-300 tabular-nums">
          {items.length}건
        </span>
      </h1>
      <p className="mt-1 text-label text-hero-muted">
        반려·게시 중단 · 사유 확인 후 다시 제출 가능
      </p>
      <ul className="mt-4 flex flex-col gap-2">
        {shown.map((item) => {
          const fix = fixActionOf(item)!;
          const status = getUserStatus(item, now);
          return (
            <li
              key={item.id}
              className="flex flex-wrap items-center gap-3 rounded-card bg-hero-raised p-3"
            >
              <SubmissionThumb submission={item} />
              <div className="min-w-0 flex-1 basis-40">
                <p className="text-caption text-hero-muted">
                  {KIND_INFO[item.type].name} ·{" "}
                  <b className="font-bold text-accent-300">{status.label}</b>
                  {" · "}
                  <Link
                    to={to.submissionDetail(item.id)}
                    className="font-semibold text-hero-ink underline underline-offset-2 hover:no-underline"
                  >
                    사유 보기
                  </Link>
                </p>
                <p className="mt-0.5 line-clamp-2 font-bold text-hero-ink">
                  {item.title}
                </p>
              </div>
              <Link
                to={fix.href}
                className="ml-auto inline-flex h-9 shrink-0 items-center justify-center rounded-tile bg-accent px-3.5 text-label font-extrabold text-accent-on transition-colors hover:bg-accent-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                {fix.label}
              </Link>
            </li>
          );
        })}
      </ul>
      {more > 0 && (
        <Link
          to={to.mine()}
          className="mt-3 inline-block text-label font-semibold text-hero-ink underline underline-offset-2 hover:no-underline"
        >
          {more}건 더 · 내 콘텐츠에서 보기
        </Link>
      )}
    </HeroPanel>
  );
}

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
  return (
    <li className="flex items-center gap-4 border-t border-surface-muted px-5 py-3.5 sm:px-6">
      <SubmissionThumb submission={item} />
      <div className="min-w-0 flex-1">
        <p className="text-caption text-ink-subtle">
          {KIND_INFO[item.type].name} · {formatPeriod(item)}
        </p>
        <p className="line-clamp-2 font-bold text-ink">
          <Link
            to={to.submissionDetail(item.id)}
            className="underline-offset-4 hover:underline"
          >
            {item.title}
          </Link>
        </p>
        <p className="text-caption text-ink-muted">
          <span className={cn("font-semibold", USER_STATUS_TEXT[status.tone])}>
            {status.label}
          </span>
          {status.note && ` · ${status.note}`}
          {impressions && ` · TV 노출 ${impressions.impressions.toLocaleString("ko-KR")}번`}
        </p>
      </div>
    </li>
  );
}
