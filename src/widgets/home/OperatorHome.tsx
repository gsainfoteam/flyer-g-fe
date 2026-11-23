import { ChevronRight, Tv } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { isTargetedTo } from "@/entities/device/model/board";
import type { DisplayDevice } from "@/entities/device/model/types";
import { DeviceScreen } from "@/entities/device/ui/DeviceScreen";
import { KIND_INFO } from "@/entities/submission/model/kind";
import type { SubmissionView } from "@/entities/submission/model/types";
import { PageState } from "@/shared/components";
import { to } from "@/shared/config/routes";
import {
  formatElapsed,
  formatSeoulMonthDay,
  formatTimeAgo,
  getSeoulParts,
} from "@/shared/lib/datetime";
import { cn } from "@/shared/lib/utils";
import { RecentDecisions } from "./RecentDecisions";
import { LONG_WAIT_MS, QUEUE_LIMIT, useReviewDesk } from "./use-review-desk";
import type { ReviewDesk } from "./use-review-desk";

/**
 * 운영자 홈 (기획 4-0). 온 이유는 "TV에 문제 없나, 지금 뭐가 나오나"라서 TV 화면이
 * 주인공이다. 게시자 홈(올리기)·하우스 관리자 홈(다음 차례)과 같은 틀에서 맨 위 칸만
 * 역할의 일로 바뀐다.
 *
 * 제목 줄에 TV 수와 꺼진 TV. 왼쪽에 TV마다 작은 화면(꺼진 TV는 화면 자리에 이유와 바로
 * 가는 길)과 그 아래 지금 걸린 콘텐츠, 오른쪽에 심사 대기와 최근 처리. 긴급 공지·지금 띄우기(9.5),
 * 오늘 편성 흐름(9.3), 오늘 참여(9.7), 수집 실패(9.6)는 그 단계에서 더한다.
 */
export function OperatorHome() {
  const desk = useReviewDesk();
  const devices = (desk.devices?.items ?? []).filter(
    (device) => device.status !== "DISABLED",
  );

  return (
    <PageState
      isLoading={desk.isLoading}
      error={desk.error}
      onRetry={desk.retry}
      loadingRows={5}
    >
      {desk.ready && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <h1 className="text-[22px] leading-tight font-extrabold tracking-[-0.03em] text-ink">
                로비 TV {devices.length}대
              </h1>
              <p className="mt-1 text-label text-ink-muted">
                {formatNow(desk.ready.now)} · <DeviceLine devices={devices} />
              </p>
            </div>
            <Link
              to={to.tv()}
              className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-control bg-surface px-3.5 text-label font-semibold text-ink ring-1 ring-line-strong transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              <Tv size={16} aria-hidden="true" className="text-ink-muted" />
              TV 관리
            </Link>
          </div>

          <div className="flex flex-wrap items-start gap-4">
            <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-4">
              <TvScreens devices={devices} desk={desk.ready} />
              <TodayOnTv desk={desk.ready} />
            </div>
            <aside className="flex min-w-0 flex-[1_1_280px] flex-col gap-4">
              <QueueSummary desk={desk.ready} />
              <RecentDecisions
                decisions={desk.ready.decisions.slice(0, 5)}
                now={desk.ready.now}
              />
            </aside>
          </div>
        </>
      )}
    </PageState>
  );
}

/** "1대 켜짐 · B동 로비 꺼짐 · 화면 끔 1대" */
function DeviceLine({ devices }: { devices: DisplayDevice[] }) {
  const online = devices.filter((device) => device.status === "ONLINE");
  const offline = devices.filter((device) => device.status === "OFFLINE");
  const sleeping = devices.filter((device) => device.status === "SLEEPING");
  return (
    <>
      {online.length}대 켜짐
      {offline.length > 0 && (
        <>
          {" · "}
          <span className="font-semibold text-accent-700">
            {offline.map((device) => device.name).join(", ")} 꺼짐
          </span>
        </>
      )}
      {sleeping.length > 0 && ` · 화면 끔 ${sleeping.length}대`}
    </>
  );
}

/**
 * TV마다 작은 화면. 한 칸에 모아 TV가 늘어도 한눈에 들어오게 칸 크기를 작게 고정하고
 * 줄을 바꿔 채운다. 화면 끔 시간의 TV는 정해 둔 대로 쉬는 것이라 꺼짐으로 짚지 않는다.
 */
function TvScreens({
  devices,
  desk,
}: {
  devices: DisplayDevice[];
  desk: ReviewDesk;
}) {
  const published = desk.board.filter((item) => item.status === "PUBLISHED");
  return (
    <section
      aria-labelledby="tv-now"
      className="rounded-card bg-surface p-4 ring-1 ring-line sm:p-5"
    >
      <h2 id="tv-now" className="mb-3.5 text-subhead text-ink">
        TV 지금
      </h2>
      {devices.length === 0 ? (
        <div className="py-4">
          <p className="text-label text-ink-muted">등록한 TV가 없어요.</p>
          <Link
            to={to.tv()}
            className="mt-1 inline-flex items-center text-label font-semibold text-ink hover:underline"
          >
            TV 관리에서 등록하기
            <ChevronRight size={15} aria-hidden="true" />
          </Link>
        </div>
      ) : (
        <ul
          aria-label="TV 화면"
          className="grid grid-cols-[repeat(auto-fill,minmax(12.5rem,1fr))] gap-x-4 gap-y-5"
        >
          {devices.map((device) => (
            <TvCard
              key={device.id}
              device={device}
              published={published}
              now={desk.now}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function TvCard({
  device,
  published,
  now,
}: {
  device: DisplayDevice;
  published: SubmissionView[];
  now: Date;
}) {
  const posters = published.filter((item) =>
    isTargetedTo(device, item.targetGroupIds),
  ).length;
  const offline = device.status === "OFFLINE";
  const sleeping = device.status === "SLEEPING";
  const meta = offline
    ? device.lastSeenAt
      ? `꺼짐 · ${formatTimeAgo(device.lastSeenAt, now)} 마지막 연결`
      : "꺼짐"
    : sleeping
      ? "화면 끔 시간"
      : device.lastSeenAt
        ? `${formatTimeAgo(device.lastSeenAt, now)} 연결`
        : "켜짐";

  return (
    <li className="flex min-w-0 flex-col gap-2">
      <DeviceScreen
        device={device}
        posters={posters}
        now={now}
        action={
          <Link
            to={to.tv()}
            className="inline-flex h-7 items-center rounded-control bg-accent px-2.5 text-caption font-bold text-accent-on transition-colors hover:bg-accent-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            기기 보기
          </Link>
        }
      />
      <div className="min-w-0 px-0.5">
        <div className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className={cn(
              "size-1.75 shrink-0 rounded-full",
              offline ? "bg-accent" : sleeping ? "bg-info" : "bg-success",
            )}
          />
          <h3 className="min-w-0 truncate text-label font-bold text-ink">
            {device.name}
          </h3>
          {device.programGroupId && (
            <Link
              to={to.tvLineup(device.programGroupId)}
              className="ml-auto inline-flex shrink-0 items-center text-caption text-ink-muted hover:text-ink"
            >
              편성
              <ChevronRight size={14} aria-hidden="true" />
            </Link>
          )}
        </div>
        <p
          className={cn(
            "mt-0.5 truncate text-caption",
            offline ? "text-accent-700" : "text-ink-subtle",
          )}
        >
          {meta}
        </p>
      </div>
    </li>
  );
}

/** 운영자도 심사한다. 하우스 관리자 홈의 다음 차례를 대기 수와 버튼으로 줄였다. */
function QueueSummary({ desk }: { desk: ReviewDesk }) {
  const late = desk.oldest.filter(
    (item) =>
      desk.now.getTime() - (item.submittedAt ?? item.createdAt).getTime() >
      LONG_WAIT_MS,
  );
  // 오래된 건은 QUEUE_LIMIT개만 받는다. 거기에 닿고 대기가 더 있으면 "이상"
  const more =
    late.length >= QUEUE_LIMIT && desk.queue.total > QUEUE_LIMIT ? " 이상" : "";
  return (
    <section
      aria-labelledby="operator-queue"
      className="flex flex-col rounded-card bg-surface px-5 py-4 ring-1 ring-line"
    >
      <h2 id="operator-queue" className="text-subhead text-ink">
        심사 대기 {desk.queue.total}건
      </h2>
      <p className="mt-1 text-label text-ink-muted">
        {late.length > 0 ? (
          <>
            24시간 넘은 것{" "}
            <span className="font-semibold text-accent-700">
              {late.length}건{more}
            </span>
            {" · 가장 오래 "}
            {formatElapsed(late[0]!.submittedAt ?? late[0]!.createdAt, desk.now)}
          </>
        ) : desk.queue.total > 0 ? (
          "24시간 넘은 것 없음"
        ) : (
          "기다리는 콘텐츠 없음"
        )}
      </p>
      <Link
        to={to.review()}
        className="mt-3.5 flex h-9 items-center justify-center rounded-control text-label font-semibold text-ink ring-1 ring-line-strong transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        {desk.queue.total > 0 ? "오래된 것부터 심사" : "심사 화면 열기"}
      </Link>
    </section>
  );
}

/** 지금 게시 중 수와 오늘 시작·끝나는 수. 그룹 편성(9.3) 뒤에는 오늘 편성 흐름으로 바꾼다. */
const ON_AIR_SHOWN = 4;

/**
 * 지금 TV에 걸린 콘텐츠. 곧 끝나는 것부터 몇 건을 한 줄씩 두고, 제목 줄에 게시 중·오늘
 * 시작·오늘 끝 수를 짧게 붙인다. TV 화면 칸 바로 아래에 두어 "지금 뭐가 나오나"에 이어서
 * 답한다.
 */
function TodayOnTv({ desk }: { desk: ReviewDesk }) {
  const published = desk.board
    .filter((item) => item.status === "PUBLISHED")
    .sort(
      (a, b) =>
        (a.endAt?.getTime() ?? Infinity) - (b.endAt?.getTime() ?? Infinity),
    );
  const endsToday = new Set(desk.endsToday.map((item) => item.id));
  const startsToday = new Set(desk.startsToday.map((item) => item.id));
  const shown = published.slice(0, ON_AIR_SHOWN);

  return (
    <section
      aria-labelledby="today-on-tv"
      className="overflow-hidden rounded-card bg-surface ring-1 ring-line"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line px-5 py-3.5">
        <h2 id="today-on-tv" className="text-subhead text-ink">
          오늘 TV
        </h2>
        <p className="flex flex-wrap gap-x-3 text-label text-ink-muted">
          <Count label="게시 중">{published.length}건</Count>
          <Count label="오늘 시작">{desk.startsToday.length}건</Count>
          <Count label="오늘 끝">{desk.endsToday.length}건</Count>
        </p>
        <Link
          to={to.contents()}
          className="ml-auto inline-flex items-center text-label text-ink-muted hover:text-ink"
        >
          전체 콘텐츠
          <ChevronRight size={15} aria-hidden="true" />
        </Link>
      </div>
      {shown.length === 0 ? (
        <p className="px-5 py-4 text-label text-ink-muted">
          지금 게시 중인 콘텐츠 없음
        </p>
      ) : (
        <ul>
          {shown.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-3 border-t border-surface-muted px-5 py-2.75 text-label first:border-t-0"
            >
              <span className="min-w-0 flex-1 truncate font-semibold text-ink">
                {item.title}
              </span>
              <span className="hidden w-20 shrink-0 text-ink-muted sm:block">
                {KIND_INFO[item.type].short}
              </span>
              <span
                className={cn(
                  "w-28 shrink-0 text-right",
                  endsToday.has(item.id) ? "text-ink" : "text-ink-muted",
                )}
              >
                {endsToday.has(item.id)
                  ? "오늘 끝"
                  : startsToday.has(item.id)
                    ? "오늘 시작"
                    : item.endAt
                      ? `${formatSeoulMonthDay(item.endAt)}까지`
                      : "기간 없음"}
              </span>
            </li>
          ))}
        </ul>
      )}
      {published.length > shown.length && (
        <Link
          to={to.contents()}
          className="flex items-center justify-center border-t border-surface-muted py-2.5 text-label text-ink-muted hover:text-ink"
        >
          {published.length - shown.length}건 더 보기
        </Link>
      )}
    </section>
  );
}

function Count({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span>
      {label} <b className="font-semibold text-ink">{children}</b>
    </span>
  );
}

/** "11월 23일 월요일 10:37" */
function formatNow(now: Date): string {
  const { hour24, minute, weekday } = getSeoulParts(now);
  const time = `${String(hour24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  return `${formatSeoulMonthDay(now)} ${weekday}요일 ${time}`;
}
