/**
 * 신청 종류. 사용자가 올리고 심사를 거치는 컨텐츠는 세 가지다.
 *
 * 서버의 `type` 필드(배포 ②)가 오기 전에는 모든 신청이 포스터다. 화면의 색·아이콘·
 * 이름은 이 목록 하나에서 정한다. (기획 2-1)
 */
export const SUBMISSION_KINDS = ["POSTER", "EVENT_BANNER", "STORY"] as const;
export type SubmissionKind = (typeof SUBMISSION_KINDS)[number];

interface KindInfo {
  /** 칩·표처럼 좁은 곳의 이름 */
  short: string;
  /** 올리기 화면처럼 넓은 곳의 이름 */
  name: string;
}

export const KIND_INFO: Record<SubmissionKind, KindInfo> = {
  POSTER: { short: "포스터", name: "포스터" },
  EVENT_BANNER: { short: "이벤트", name: "이벤트 배너" },
  STORY: { short: "제보", name: "소식 제보" },
};
