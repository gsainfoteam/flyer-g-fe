import { Tv } from "lucide-react";
import { Link } from "react-router";
import type { DisplayDevice } from "@/entities/device/model/types";
import { PageState } from "@/shared/components";
import { to } from "@/shared/config/routes";
import {
  formatElapsed,
  formatSeoulMonthDay,
  getSeoulParts,
} from "@/shared/lib/datetime";
import { ChecksToDo } from "./ChecksToDo";
import type { CheckItem } from "./ChecksToDo";
import { DeviceNow } from "./DeviceNow";
import { LONG_WAIT_MS } from "./OldestQueue";
import { QueueCard } from "./QueueHero";
import { RecentDecisions } from "./RecentDecisions";
import type { ReviewDesk } from "./use-review-desk";
import { useReviewDesk } from "./use-review-desk";

/**
 * 운영자 홈 (기획 4-0). 온 이유는 "문제 없나, 지금 뭐가 나오나"다.
 *
 * 맨 위에 확인할 것(꺼진 TV, 오래 기다린 심사)을 두고, TV마다 지금 모습, 옆 칸에
 * 심사 대기와 최근 처리를 둔다. 긴급 공지·지금 띄우기(9.5), 오늘 편성 흐름(9.3),
 * 오늘 참여(9.7), 수집 실패(9.6)는 그 단계에서 더한다.
 */
export function OperatorHome() {
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
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <p className="text-label font-bold text-ink-subtle">
                {formatToday(desk.ready.now)}
              </p>
              <h1 className="mt-0.5 text-[2.125rem] leading-tight font-black tracking-[-0.04em] text-ink">
                {formatClock(desk.ready.now)}
              </h1>
            </div>
            <Link
              to={to.tv()}
              className="ml-auto inline-flex h-11 items-center gap-2 rounded-tile bg-surface px-4 text-label font-bold text-ink ring-1 ring-line-strong transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              <Tv size={18} aria-hidden="true" />
              TV 관리
            </Link>
          </div>

          <ChecksToDo items={checksOf(desk.ready, desk.devices?.items ?? [])} />

          <div className="flex flex-wrap items-start gap-5">
            <div className="flex min-w-0 flex-[999_1_640px] flex-col gap-5">
              <DeviceNow
                devices={desk.devices?.items ?? []}
                published={desk.ready.board.filter(
                  (item) => item.status === "PUBLISHED",
                )}
                now={desk.ready.now}
              />
            </div>
            <aside className="flex min-w-0 flex-[1_1_320px] flex-col gap-5 lg:max-w-[420px]">
              <QueueCard queue={desk.ready.queue} />
              <RecentDecisions
                title="최근 기록"
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

function checksOf(desk: ReviewDesk, devices: DisplayDevice[]): CheckItem[] {
  const offline: CheckItem[] = devices
    .filter((device) => device.status === "OFFLINE")
    .map((device) => ({
      key: `device-${device.id}`,
      kind: "device",
      title: `${device.name} 꺼짐`,
      detail: device.lastSeenAt
        ? `${formatElapsed(device.lastSeenAt, desk.now)}째 연결 없음`
        : "연결 기록 없음",
      action: "기기 보기",
      href: to.tv(),
    }));

  const longWaits = desk.oldest.filter(
    (item) =>
      desk.now.getTime() - (item.submittedAt ?? item.createdAt).getTime() >
      LONG_WAIT_MS,
  );
  const waits: CheckItem[] =
    longWaits.length > 0
      ? [
          {
            key: "long-wait",
            kind: "wait",
            title: `오래 기다린 심사 ${longWaits.length}건`,
            detail: `24시간 넘음 · 가장 오래 ${formatElapsed(
              longWaits[0]!.submittedAt ?? longWaits[0]!.createdAt,
              desk.now,
            )}`,
            action: "심사하기",
            href: to.review(),
          },
        ]
      : [];

  return [...offline, ...waits];
}

/** "10월 30일 목요일" */
function formatToday(now: Date): string {
  return `${formatSeoulMonthDay(now)} ${getSeoulParts(now).weekday}요일`;
}

/** "12:10 · 점심 시간대" */
function formatClock(now: Date): string {
  const { hour24, minute } = getSeoulParts(now);
  const time = `${String(hour24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  return `${time} · ${periodOf(hour24)}`;
}

function periodOf(hour: number): string {
  if (hour < 6) return "새벽";
  if (hour < 10) return "아침 시간대";
  if (hour < 14) return "점심 시간대";
  if (hour < 17) return "오후";
  if (hour < 20) return "저녁 시간대";
  return "밤";
}
