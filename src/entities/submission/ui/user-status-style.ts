import type { UserStatusTone } from "../model/user-status";

/** 사용자 상태 글자색. 색은 보조라 항상 상태 이름과 함께 쓴다. */
export const USER_STATUS_TEXT: Record<UserStatusTone, string> = {
  progress: "text-info-strong",
  live: "text-success-strong",
  problem: "text-accent-700",
  done: "text-ink-subtle",
};
