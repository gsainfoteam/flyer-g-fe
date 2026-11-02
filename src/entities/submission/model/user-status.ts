import {
  formatElapsed,
  formatSeoulDayRange,
  formatSeoulMonthDay,
  seoulLastDay,
} from "@/shared/lib/datetime";
import type { SubmissionView } from "./types";

/**
 * 올린 사람에게 보여 주는 짧은 상태. "심사 중 · 9시간째", "게시 중 · 11월 14일까지".
 *
 * 관리 화면의 상태 배지(`getStatusMeta`)보다 사용자 말에 가깝다. 색은 보조이고
 * 이름과 메모가 뜻을 전한다. (기획 4-1)
 */
export type UserStatusTone = "progress" | "live" | "problem" | "done";

export interface UserStatus {
  label: string;
  /** 상태 옆의 한마디. 없으면 null */
  note: string | null;
  tone: UserStatusTone;
}

export function getUserStatus(view: SubmissionView, now: Date): UserStatus {
  switch (view.status) {
    case "DRAFT":
      return { label: "작성 중", note: "아직 내지 않음", tone: "progress" };
    case "PENDING_REVIEW":
      return {
        label: "심사 중",
        note: `${formatElapsed(view.submittedAt ?? view.createdAt, now)}째`,
        tone: "progress",
      };
    case "APPROVED":
    case "SCHEDULED":
      return {
        label: "게시 예정",
        note: view.startAt ? `${formatSeoulMonthDay(view.startAt)} 시작` : null,
        tone: "progress",
      };
    case "PUBLISHED":
      return {
        label: "게시 중",
        note:
          view.startAt && view.endAt
            ? `${formatSeoulMonthDay(seoulLastDay(view.startAt, view.endAt))}까지`
            : null,
        tone: "live",
      };
    case "REJECTED":
      return { label: "반려", note: "사유 확인", tone: "problem" };
    case "SUSPENDED":
      return { label: "게시 중단", note: "사유 확인", tone: "problem" };
    case "ENDED":
      return { label: "게시 끝", note: null, tone: "done" };
    case "CANCELED":
      return { label: "취소", note: null, tone: "done" };
    case "ARCHIVED":
      return { label: "보관", note: null, tone: "done" };
  }
}

/**
 * 표의 기간 칸. "11월 3일 – 14일". 제보는 승인한 순간부터 기간이 정해지므로
 * 승인 전에는 기간이 없다.
 */
export function formatPeriod(
  view: Pick<SubmissionView, "startAt" | "endAt">,
): string {
  if (!view.startAt || !view.endAt) return "승인 후 정해짐";
  return formatSeoulDayRange(view.startAt, view.endAt);
}
