import type { SubmissionStatus } from "./types";

/**
 * 신청이 지금 어디쯤 왔는지 다섯 단계로 보여준다. 신청 → 검토 → 예약 → 게시 중 → 종료.
 *
 * 게시자는 신청이 몇 건 없다. 목록의 배지 하나보다 "다음에 무슨 일이 일어나는지"가
 * 보이는 편이 낫다. 반려·중단처럼 멈춘 곳은 그 단계의 이름을 바꿔 `problem`으로 둔다.
 */
export type ProgressStepState = "done" | "current" | "problem" | "todo";

export interface ProgressStep {
  label: string;
  state: ProgressStepState;
}

const steps = (...entries: [string, ProgressStepState][]): ProgressStep[] =>
  entries.map(([label, state]) => ({ label, state }));

export function getProgressSteps(status: SubmissionStatus): ProgressStep[] {
  switch (status) {
    case "DRAFT":
    case "PENDING_REVIEW":
      return steps(
        ["신청", "done"],
        ["검토 중", "current"],
        ["예약", "todo"],
        ["게시 중", "todo"],
        ["종료", "todo"],
      );
    case "REJECTED":
      return steps(
        ["신청", "done"],
        ["반려", "problem"],
        ["예약", "todo"],
        ["게시 중", "todo"],
        ["종료", "todo"],
      );
    case "CANCELED":
      return steps(
        ["신청", "done"],
        ["취소", "current"],
        ["예약", "todo"],
        ["게시 중", "todo"],
        ["종료", "todo"],
      );
    case "APPROVED":
    case "SCHEDULED":
      return steps(
        ["신청", "done"],
        ["승인", "done"],
        ["예약", "current"],
        ["게시 중", "todo"],
        ["종료", "todo"],
      );
    case "PUBLISHED":
      return steps(
        ["신청", "done"],
        ["승인", "done"],
        ["예약", "done"],
        ["게시 중", "current"],
        ["종료", "todo"],
      );
    case "SUSPENDED":
      return steps(
        ["신청", "done"],
        ["승인", "done"],
        ["예약", "done"],
        ["중단", "problem"],
        ["종료", "todo"],
      );
    case "ENDED":
    case "ARCHIVED":
      return steps(
        ["신청", "done"],
        ["승인", "done"],
        ["예약", "done"],
        ["게시", "done"],
        ["종료", "current"],
      );
  }
}
