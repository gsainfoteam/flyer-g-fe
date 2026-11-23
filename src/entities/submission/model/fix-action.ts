import { to } from "@/shared/config/routes";
import { canSubmitterResubmit } from "./status";
import type { SubmissionView } from "./types";

/**
 * 반려·게시 중단된 신청을 고치러 가는 길. 목록(홈·내 컨텐츠)의 강조 링크가 쓴다.
 *
 * 종류마다 고치는 화면이 다르다. 포스터와 이벤트 배너는 고쳐서 다시 내고, 제보는
 * 고칠 수 없어(`NOT_RESUBMITTABLE`) 새로 쓴다. 상세 화면의 `SubmitterActions`와 같은 규칙이다.
 * 고칠 일이 없으면 null이다.
 */
export function fixActionOf(
  submission: Pick<SubmissionView, "id" | "type" | "status">,
): { label: string; href: string } | null {
  const returned =
    submission.status === "REJECTED" || submission.status === "SUSPENDED";
  if (!returned || !canSubmitterResubmit(submission.status)) return null;

  switch (submission.type) {
    case "POSTER":
      return { label: "고쳐서 다시 내기", href: to.editPoster(submission.id) };
    case "EVENT_BANNER":
      return { label: "고쳐서 다시 내기", href: to.editEvent(submission.id) };
    case "STORY":
      return { label: "새로 쓰기", href: to.newStory() };
  }
}
