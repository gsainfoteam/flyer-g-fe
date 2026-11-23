import { CheckCheck, Info, ListChecks, Tv, WifiOff, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";
import type { DeviceList } from "@/entities/device/model/types";
import type { SubmissionView } from "@/entities/submission/model/types";
import { IconTile, PageState } from "@/shared/components";
import { cn } from "@/shared/lib/utils";
import { OldestQueue } from "./OldestQueue";
import { QueueHero } from "./QueueHero";
import { RecentDecisions } from "./RecentDecisions";
import { TodayStartsEnds } from "./TodayOnTv";
import { useReviewDesk } from "./use-review-desk";

/**
 * 하우스 관리자 홈 (기획 4-0). 온 이유는 "쌓인 것 처리"다.
 *
 * 심사 대기 건수를 어두운 강조 카드에 가장 크게 두고, 옆 "오늘" 칸에 처리 수·TV 상태·
 * 오늘 시작·끝나는 콘텐츠를 모은다. 아래는 오래 기다린 다섯 건과 최근 처리다. 처음 한
 * 번은 심사 안내를 보여 준다(닫으면 다시 안 나옴).
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
          <div className="flex flex-wrap items-stretch gap-5">
            <QueueHero queue={desk.ready.queue} />
            <ReviewerToday
              decidedToday={desk.ready.decidedToday}
              decidedThisWeek={desk.ready.decidedThisWeek}
              decisionsCapped={desk.ready.decisionsCapped}
              devices={desk.devices}
              starts={desk.ready.startsToday}
              ends={desk.ready.endsToday}
            />
          </div>
          <div className="flex flex-wrap items-start gap-5">
            <OldestQueue items={desk.ready.oldest} now={desk.ready.now} />
            <aside className="flex min-w-0 flex-[1_1_320px] flex-col gap-5">
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

/**
 * 오늘 한눈에: 처리 수, TV 상태, 오늘 시작·끝나는 콘텐츠. 숫자 칸 네 개를 하나로 합쳤다.
 * 0이 큰 숫자로 자리를 차지하지 않게 작은 글로 둔다.
 */
function ReviewerToday({
  decidedToday,
  decidedThisWeek,
  decisionsCapped,
  devices,
  starts,
  ends,
}: {
  decidedToday: number;
  decidedThisWeek: number;
  decisionsCapped: boolean;
  devices: DeviceList | undefined;
  starts: SubmissionView[];
  ends: SubmissionView[];
}) {
  return (
    <section
      aria-labelledby="reviewer-today"
      className="flex min-w-0 flex-[1_1_320px] flex-col rounded-block bg-surface px-6 py-5.5 ring-1 ring-line"
    >
      <h2 id="reviewer-today" className="text-subhead text-ink">
        오늘
      </h2>
      <dl className="mt-3 grid grid-cols-2 gap-3">
        <Count
          icon={CheckCheck}
          label="오늘 처리"
          value={`${decidedToday}건`}
        />
        <Count
          icon={ListChecks}
          label="이번 주 처리"
          value={`${decidedThisWeek}${decisionsCapped ? "+" : ""}건`}
        />
      </dl>
      <DeviceLine devices={devices} />
      <TodayStartsEnds
        starts={starts}
        ends={ends}
        className="mt-4 border-t border-surface-muted pt-4"
      />
    </section>
  );
}

function Count({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon size={16} className="shrink-0 text-ink-subtle" aria-hidden="true" />
      <dt className="text-label text-ink-muted">{label}</dt>
      <dd className="ml-auto text-label font-extrabold text-ink tabular-nums">
        {value}
      </dd>
    </div>
  );
}

/** TV 켜짐 수. 하우스 관리자는 기기를 읽기만 한다. 꺼진 TV가 있으면 빨간 줄로 알린다. */
function DeviceLine({ devices }: { devices: DeviceList | undefined }) {
  const all = devices?.items.filter((device) => device.status !== "DISABLED");
  const online = all?.filter((device) => device.status === "ONLINE");
  const offline = all?.filter((device) => device.status === "OFFLINE") ?? [];
  // 화면 끔 시간의 TV는 정상이다. 켜짐 수가 모자란 이유만 밝힌다.
  const sleeping = all?.filter((device) => device.status === "SLEEPING") ?? [];
  const label = [
    "TV 켜짐",
    offline.length > 0 &&
      `${offline.map((device) => device.name).join(", ")} 꺼짐`,
    sleeping.length > 0 && `화면 끔 ${sleeping.length}대`,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <p
      className={cn(
        "mt-3 flex items-center gap-2 rounded-tile px-3 py-2.5 text-label",
        offline.length > 0
          ? "bg-danger-subtle text-danger-strong"
          : "bg-surface-muted text-ink-muted",
      )}
    >
      {offline.length > 0 ? (
        <WifiOff size={16} className="shrink-0" aria-hidden="true" />
      ) : (
        <Tv size={16} className="shrink-0 text-ink-subtle" aria-hidden="true" />
      )}
      <span className="min-w-0 flex-1">{label}</span>
      <b className="shrink-0 font-extrabold tabular-nums">
        {online ? online.length : "–"}
        {all && `/${all.length}`}
      </b>
    </p>
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
      className="flex flex-wrap items-center gap-3.5 rounded-[0.875rem] bg-info-subtle px-4.5 py-3.5 text-label text-blue-900"
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
