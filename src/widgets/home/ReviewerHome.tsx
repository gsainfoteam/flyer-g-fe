import { Info, X } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";
import type { DeviceList } from "@/entities/device/model/types";
import { IconTile, PageState } from "@/shared/components";
import { formatElapsed } from "@/shared/lib/datetime";
import { cn } from "@/shared/lib/utils";
import { NextReview, UpNext } from "./NextReview";
import { RecentDecisions } from "./RecentDecisions";
import { LONG_WAIT_MS, useReviewDesk } from "./use-review-desk";
import type { QueueNumbers, ReviewDesk } from "./use-review-desk";

/**
 * 하우스 관리자 홈 (기획 4-0). 온 이유는 "쌓인 것 처리"라서 다음에 심사할 건이 주인공이다.
 * 게시자 홈(올리기)·운영자 홈(TV 화면)과 같은 틀에서 맨 위 칸만 역할의 일로 바뀐다.
 *
 * 제목에 대기 수와 종류 구성, 그 아래 다음 차례 한 건을 크게, 옆에 그다음 건들, 아래에
 * 오늘(처리 수·TV 상태·게시 시작·끝)과 최근 처리. 처음 한 번은 심사 안내를 보여 준다
 * (닫으면 다시 안 나옴).
 */
const INTRO_KEY = "flyerg:reviewer-intro-dismissed";

export function ReviewerHome() {
  const desk = useReviewDesk();

  return (
    <PageState
      isLoading={desk.isLoading}
      error={desk.error}
      onRetry={desk.retry}
      loadingRows={5}
    >
      {desk.ready && (
        <>
          <ReviewerIntro />
          <QueueTitle desk={desk.ready} />
          <div className="flex flex-wrap items-stretch gap-4">
            <NextReview item={desk.ready.oldest[0]} now={desk.ready.now} />
            <UpNext items={desk.ready.oldest.slice(1)} now={desk.ready.now} />
          </div>
          <div className="mt-2 grid items-start gap-4 md:grid-cols-2">
            <ReviewerToday desk={desk.ready} devices={desk.devices} />
            <RecentDecisions
              decisions={desk.ready.decisions.slice(0, 4)}
              now={desk.ready.now}
            />
          </div>
        </>
      )}
    </PageState>
  );
}

/** "심사 대기 6건"과 종류 구성·오래 기다린 수 한 줄 */
function QueueTitle({ desk }: { desk: ReviewDesk }) {
  const lateCount = desk.oldest.filter(
    (item) =>
      desk.now.getTime() - (item.submittedAt ?? item.createdAt).getTime() >
      LONG_WAIT_MS,
  ).length;
  return (
    <div>
      <h1 className="text-[22px] leading-tight font-extrabold tracking-[-0.03em] text-ink">
        심사 대기 {desk.queue.total}건
      </h1>
      <p className="mt-1 text-label text-ink-muted">
        {kindSummary(desk.queue)}
        {lateCount > 0 && (
          <>
            {" · 24시간 넘은 것 "}
            <span className="font-semibold text-accent-700">
              {lateCount}건{lateCount >= desk.oldest.length && desk.queue.total > desk.oldest.length ? " 이상" : ""}
            </span>
          </>
        )}
        {lateCount === 0 && desk.queue.oldestSubmittedAt && (
          <>
            {" · 가장 오래 "}
            {formatElapsed(desk.queue.oldestSubmittedAt, desk.now)}
          </>
        )}
      </p>
    </div>
  );
}

function kindSummary(queue: QueueNumbers): string {
  return [
    `포스터 ${queue.byKind.POSTER}`,
    `이벤트 배너 ${queue.byKind.EVENT_BANNER}`,
    `소식 제보 ${queue.byKind.STORY}`,
  ].join(" · ");
}

/**
 * 오늘 한눈에: 처리 수, TV 상태, 오늘 게시 시작·끝. 0이 큰 숫자로 자리를 차지하지 않게
 * 한 줄씩 글로 둔다. 꺼진 TV만 빨간 글로 짚는다.
 */
function ReviewerToday({
  desk,
  devices,
}: {
  desk: ReviewDesk;
  devices: DeviceList | undefined;
}) {
  return (
    <section
      aria-labelledby="reviewer-today"
      className="rounded-card bg-surface px-5 pt-4 pb-2 ring-1 ring-line"
    >
      <h2 id="reviewer-today" className="mb-1.5 text-subhead text-ink">
        오늘
      </h2>
      <dl>
        <Row label="처리">
          {desk.decidedToday}건 · 이번 주 {desk.decidedThisWeek}
          {desk.decisionsCapped ? "+" : ""}건
        </Row>
        <Row label="TV">
          <DeviceSummary devices={devices} />
        </Row>
        <Row label="게시 시작·끝">
          시작 {desk.startsToday.length}건 · 끝 {desk.endsToday.length}건
        </Row>
      </dl>
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-t border-surface-muted py-2.5 text-label">
      <dt className="shrink-0 text-ink-muted">{label}</dt>
      <dd className="text-right font-semibold text-ink">{children}</dd>
    </div>
  );
}

/** "1/2 켜짐 · B동 로비 꺼짐". 하우스 관리자는 기기를 읽기만 한다. */
function DeviceSummary({ devices }: { devices: DeviceList | undefined }) {
  const all = devices?.items.filter((device) => device.status !== "DISABLED");
  if (!all) return <>–</>;
  const online = all.filter((device) => device.status === "ONLINE");
  const offline = all.filter((device) => device.status === "OFFLINE");
  // 화면 끔 시간의 TV는 정상이다. 켜짐 수가 모자란 이유만 밝힌다.
  const sleeping = all.filter((device) => device.status === "SLEEPING");
  return (
    <>
      {online.length}/{all.length} 켜짐
      {offline.length > 0 && (
        <>
          {" · "}
          <span className="text-accent-700">
            {offline.map((device) => device.name).join(", ")} 꺼짐
          </span>
        </>
      )}
      {sleeping.length > 0 && ` · 화면 끔 ${sleeping.length}대`}
    </>
  );
}

function ReviewerIntro() {
  const [open, setOpen] = useState(() => {
    try {
      return window.localStorage.getItem(INTRO_KEY) !== "1";
    } catch {
      return true;
    }
  });
  if (!open) return null;

  const close = () => {
    setOpen(false);
    try {
      window.localStorage.setItem(INTRO_KEY, "1");
    } catch {
      // 저장하지 못하면 다음에 다시 보일 뿐이다.
    }
  };

  return (
    <div
      role="note"
      className={cn(
        "flex flex-wrap items-center gap-3.5 rounded-control bg-info-subtle px-4.5 py-3 text-label text-blue-900",
      )}
    >
      <IconTile icon={Info} size="sm" className="bg-surface text-info-strong" />
      <b>처음이라면</b>
      <span className="min-w-0 flex-1">
        대기 시간이 긴 신청부터 심사하세요. 반려 사유는 게시자의 상세 화면에 그대로 표시됩니다.
      </span>
      <button
        type="button"
        aria-label="안내 닫기"
        onClick={close}
        className="inline-flex size-7 items-center justify-center rounded-lg hover:bg-white/70 focus-visible:outline-2 focus-visible:outline-focus"
      >
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
