import { CircleCheck, MonitorPlay, PenLine, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
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
  formatPeriod,
  getUserStatus,
  kindOfSubmission,
} from "@/entities/submission";
import type {
  SubmissionStatus,
  SubmissionView,
} from "@/entities/submission/model/types";
import { USER_STATUS_TEXT } from "@/entities/submission/ui/user-status-style";
import { useSessionUser } from "@/features/auth/model/auth-context";
import {
  useSubmissionSummary,
  useSubmissionViews,
} from "@/features/submissions/api/queries";
import { IconTile, PageState } from "@/shared/components";
import { to } from "@/shared/config/routes";
import { cn } from "@/shared/lib/utils";
import { ActivityFeed } from "./ActivityFeed";
import { RecentStories } from "./RecentStories";
import { UploadChoicesCompact, UploadChoicesLarge } from "./UploadChoices";

/**
 * 사용자 홈 (기획 4-0, 4-1).
 *
 * - 처음(올린 것 0건): "무엇을 TV에 띄워 볼까요?" 세 종류를 크게, 진행 순서 4단계.
 *   빈 "내 컨텐츠" 칸은 그리지 않는다.
 * - 다시 온 사람: 올리기 세 종류를 작게, 내 컨텐츠 진행 상황, 옆 칸에 최근 소식과
 *   지금 TV의 제보.
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

/** 고쳐야 할 것 → 걸려 있는 것 → 걸릴 것 → 심사 중인 것 */
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

function FirstVisit() {
  const user = useSessionUser();
  return (
    <>
      <div>
        <p className="text-body font-bold text-accent">
          {user.displayName}님, 처음 오셨네요
        </p>
        <h1 className="mt-1 text-[2rem] leading-tight font-black tracking-[-0.04em] text-ink sm:text-[2.25rem]">
          무엇을 TV에 띄워 볼까요?
        </h1>
      </div>
      <UploadChoicesLarge />
      <div className="flex flex-wrap items-stretch gap-5">
        <section
          aria-labelledby="first-flow"
          className="min-w-0 flex-[1.2_1_440px] rounded-block bg-surface px-7 pt-7 pb-6 ring-1 ring-line"
        >
          <h2 id="first-flow" className="text-heading text-ink">
            올리면 이렇게 진행돼요
          </h2>
          <ol className="relative mt-5">
            <span
              aria-hidden="true"
              className="absolute top-5 bottom-6 left-[19px] w-0.5 bg-line"
            />
            <Step icon={PenLine} title="올리기">
              다 쓰고 심사를 요청하면 끝. 쓰는 동안 자동 저장돼요.
            </Step>
            <Step icon={ShieldCheck} title="하우스 관리자 심사">
              반려되면 사유를 알려 드려요. 고쳐서 다시 낼 수 있어요.
            </Step>
            <Step icon={MonitorPlay} title="TV에 게시">
              정한 기간 동안 여러 TV에서 번갈아 나와요. 몇 번 나왔는지도 보여
              드려요.
            </Step>
            <Step icon={CircleCheck} title="저절로 내려감" last>
              기간이 끝나면 알아서 내려가요.
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
  const ordered = [...active].sort(
    (a, b) => (ORDER[a.status] ?? 9) - (ORDER[b.status] ?? 9),
  );
  const shown = (ordered.length > 0 ? ordered : past).slice(0, SHOWN);

  return (
    <>
      <section aria-labelledby="upload" className="flex flex-col gap-4">
        <div>
          <h1 id="upload" className="text-title text-ink">
            무엇을 올릴까요?
          </h1>
          <p className="mt-1 text-label text-ink-muted">
            심사를 거쳐 기숙사 로비 TV에 나와요.
          </p>
        </div>
        <UploadChoicesCompact />
      </section>

      <div className="flex flex-wrap items-start gap-5">
        <section
          aria-labelledby="mine"
          className="min-w-0 flex-[999_1_560px] rounded-block bg-surface py-2 ring-1 ring-line"
        >
          <div className="flex items-baseline px-6 pt-3.5 pb-2">
            <h2 id="mine" className="text-subhead text-ink">
              내 컨텐츠
            </h2>
            <Link
              to={to.mine()}
              className="ml-auto text-label font-semibold text-ink hover:underline"
            >
              모두 보기
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
  const fix = item.status === "REJECTED" || item.status === "SUSPENDED";
  return (
    <li className="flex items-center gap-4 border-t border-surface-muted px-6 py-3.5">
      <PosterThumb poster={fromSubmissionView(item)} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="text-caption text-ink-subtle">
          {KIND_INFO[kindOfSubmission(item)].name} · {formatPeriod(item)}
        </p>
        <p className="truncate font-bold text-ink">
          {/* 반려·중단 사유는 상세에만 있다. 오른쪽 링크가 수정 화면일 때도 사유에 닿게 한다. */}
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
      <Link
        to={fix ? to.editPoster(item.id) : to.submissionDetail(item.id)}
        className={cn(
          "shrink-0 text-label underline-offset-4 hover:underline",
          fix ? "font-bold text-accent-700" : "text-ink",
        )}
      >
        {fix ? "고쳐서 다시 내기" : "상세"}
      </Link>
    </li>
  );
}
