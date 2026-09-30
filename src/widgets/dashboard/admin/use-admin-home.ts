import type { SubmissionStatus } from "@/entities/submission/model/types";
import { usePendingReviews } from "@/features/reviews/api/queries";
import {
  useSubmissionSummary,
  useSubmissionViews,
} from "@/features/submissions/api/queries";

/**
 * 하우스 관리자·운영자 홈이 함께 쓰는 데이터.
 *
 * 게시 중·예약 목록은 한 번만 받아 "지금 게시 중"과 "오늘 바뀌는 것"이 나눠 쓴다.
 * 목록 API에 정렬이 없어서 내려가는 날 순서는 화면에서 맞춘다. 게시판에 한 번에
 * 걸리는 포스터는 수십 장을 넘지 않는다.
 */
const BOARD_STATUSES: readonly SubmissionStatus[] = [
  "PUBLISHED",
  "SCHEDULED",
  "APPROVED",
];
const BOARD_LIMIT = 100;
export const QUEUE_LIMIT = 5;

export function useAdminHome() {
  const summary = useSubmissionSummary("all");
  const pending = usePendingReviews(QUEUE_LIMIT);
  const board = useSubmissionViews({
    statuses: BOARD_STATUSES,
    scope: "all",
    limit: BOARD_LIMIT,
  });

  const queries = [summary, pending, board];
  const ready =
    summary.data && pending.data && board.data
      ? {
          summary: summary.data,
          pending: pending.data,
          board: board.data.items,
          published: board.data.items.filter(
            (item) => item.status === "PUBLISHED",
          ),
          now: board.data.serverTime,
          oldest: pending.data.items[0],
        }
      : null;

  return {
    ready,
    isLoading: queries.some((query) => query.isPending),
    error: summary.error ?? pending.error ?? board.error,
    retry: () => queries.forEach((query) => void query.refetch()),
  };
}
