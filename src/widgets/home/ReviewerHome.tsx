import {
  CalendarCheck,
  CheckCheck,
  Info,
  ListChecks,
  Tv,
  X,
} from "lucide-react";
import { useState } from "react";
import type { DeviceList } from "@/entities/device/model/types";
import { IconTile, PageState, StatTile } from "@/shared/components";
import { OldestQueue } from "./OldestQueue";
import { QueueHero } from "./QueueHero";
import { RecentDecisions } from "./RecentDecisions";
import { TodayOnTv } from "./TodayOnTv";
import { useReviewDesk } from "./use-review-desk";

/**
 * 하우스 관리자 홈 (기획 4-0). 온 이유는 "쌓인 것 처리"다.
 *
 * 심사 대기 건수를 어두운 강조 카드에 가장 크게 두고, 옆에 오늘 처리·이번 주 처리·
 * 오늘 게시 시작·TV 상태를 숫자 칸으로 둔다. 아래는 오래 기다린 다섯 건과 오늘 TV
 * 일정, 최근 처리다. 처음 한 번은 심사 안내를 보여 준다(닫으면 다시 안 나옴).
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
            <div className="grid min-w-0 flex-[1_1_320px] grid-cols-2 gap-3">
              <StatTile
                icon={CheckCheck}
                tone="bg-success-subtle text-success-strong"
                value={desk.ready.decidedToday}
                label="오늘 처리"
              />
              <StatTile
                icon={ListChecks}
                tone="bg-type-poster-subtle text-type-poster"
                value={desk.ready.decidedThisWeek}
                unit={desk.ready.decisionsCapped ? "+" : undefined}
                label="이번 주 처리"
              />
              <StatTile
                icon={CalendarCheck}
                tone="bg-success-subtle text-success-strong"
                value={desk.ready.startsToday.length}
                label="오늘 TV 게시 시작"
              />
              <DeviceTile devices={desk.devices} />
            </div>
          </div>
          <div className="flex flex-wrap items-start gap-5">
            <OldestQueue items={desk.ready.oldest} now={desk.ready.now} />
            <aside className="flex min-w-0 flex-[1_1_320px] flex-col gap-5">
              <TodayOnTv
                starts={desk.ready.startsToday}
                ends={desk.ready.endsToday}
              />
              <RecentDecisions
                decisions={desk.ready.decisions.slice(0, 4)}
                now={desk.ready.now}
              />
            </aside>
          </div>
        </>
      )}
    </PageState>
  );
}

/** TV 켜짐 수. 하우스 관리자는 기기를 읽기만 한다. */
function DeviceTile({ devices }: { devices: DeviceList | undefined }) {
  const all = devices?.items.filter((device) => device.status !== "DISABLED");
  const online = all?.filter((device) => device.status === "ONLINE");
  const offline = all?.filter((device) => device.status === "OFFLINE") ?? [];
  return (
    <StatTile
      icon={Tv}
      tone={
        offline.length > 0
          ? "bg-accent-100 text-accent-700"
          : "bg-success-subtle text-success-strong"
      }
      value={online ? online.length : "–"}
      unit={all ? `/${all.length}` : undefined}
      label={
        offline.length > 0
          ? `TV 켜짐 · ${offline.map((device) => device.name).join(", ")} 꺼짐`
          : "TV 켜짐"
      }
    />
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
        오래 기다린 것부터 심사해 주세요. 반려 사유는 올린 사람의 상세 화면에 그대로
        보여요.
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
