import { useDevices } from "@/entities/device/api/queries";
import type { DecisionRecord } from "@/entities/review/model/types";
import type {
  SubmissionStatus,
  SubmissionView,
} from "@/entities/submission/model/types";
import { usePendingReviews, useRecentDecisions } from "@/features/reviews/api/queries";
import {
  useSubmissionSummary,
  useSubmissionViews,
} from "@/features/submissions/api/queries";
import { seoulDayDiff } from "@/shared/lib/datetime";
import type { QueueNumbers } from "./QueueHero";

/**
 * 하우스 관리자·운영자 홈이 함께 쓰는 데이터. (기획 4-0)
 *
 * 게시 중·예정 목록은 한 번만 받아 "오늘 TV에서"와 TV별 포스터 수가 나눠 쓴다.
 * 게시판에 한 번에 걸리는 컨텐츠는 수십 건을 넘지 않는다.
 */
const BOARD_STATUSES: readonly SubmissionStatus[] = [
  "PUBLISHED",
  "SCHEDULED",
  "APPROVED",
];
const BOARD_LIMIT = 100;
export const QUEUE_LIMIT = 5;
/** 오늘·이번 주 처리 수를 세려고 받는 최근 결정 수 */
const DECISION_LIMIT = 50;

export interface ReviewDesk {
  queue: QueueNumbers;
  oldest: SubmissionView[];
  /** 게시 중·예정인 모든 컨텐츠 */
  board: SubmissionView[];
  startsToday: SubmissionView[];
  endsToday: SubmissionView[];
  decisions: DecisionRecord[];
  decidedToday: number;
  decidedThisWeek: number;
  /** 결정 수가 받은 개수에 닿아 실제로는 더 많을 수 있다 */
  decisionsCapped: boolean;
  now: Date;
}

export function useReviewDesk() {
  const summary = useSubmissionSummary("all");
  const pending = usePendingReviews(QUEUE_LIMIT);
  const decisions = useRecentDecisions(DECISION_LIMIT);
  const board = useSubmissionViews({
    statuses: BOARD_STATUSES,
    scope: "all",
    limit: BOARD_LIMIT,
  });
  const devices = useDevices();

  const queries = [summary, pending, decisions, board];
  let ready: ReviewDesk | null = null;
  if (summary.data && pending.data && decisions.data && board.data) {
    const now = board.data.serverTime;
    const items = board.data.items;
    const today = (date: Date) => seoulDayDiff(date, now) === 0;
    const sinceDays = (date: Date) => seoulDayDiff(date, now);
    ready = {
      queue: {
        total: summary.data.pendingReview,
        // 종류별 건수는 배포 ②부터 온다. 그 전에는 모두 포스터다.
        byKind: {
          POSTER: summary.data.pendingReview,
          EVENT_BANNER: 0,
          STORY: 0,
        },
        oldestSubmittedAt:
          pending.data.items[0]?.submittedAt ??
          pending.data.items[0]?.createdAt ??
          null,
        now,
      },
      oldest: pending.data.items,
      board: items,
      startsToday: items.filter(
        (item) => item.startAt !== null && today(item.startAt),
      ),
      endsToday: items.filter(
        (item) =>
          item.status === "PUBLISHED" &&
          item.endAt !== null &&
          today(item.endAt),
      ),
      decisions: decisions.data,
      decidedToday: decisions.data.filter((d) => today(d.occurredAt)).length,
      decidedThisWeek: decisions.data.filter(
        (d) => sinceDays(d.occurredAt) < weekdayIndex(now) + 1,
      ).length,
      decisionsCapped: decisions.data.length >= DECISION_LIMIT,
      now,
    };
  }

  return {
    ready,
    devices: devices.data,
    isLoading: queries.some((query) => query.isPending),
    error:
      summary.error ?? pending.error ?? decisions.error ?? board.error ?? null,
    retry: () => {
      queries.forEach((query) => void query.refetch());
      void devices.refetch();
    },
  };
}

/** 서울 기준 월요일 0 … 일요일 6 */
function weekdayIndex(now: Date): number {
  const shifted = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return (shifted.getUTCDay() + 6) % 7;
}
