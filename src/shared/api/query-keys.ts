import type { SubmissionListParams } from "@/entities/submission/model/types";

/**
 * 서버 상태 캐시 키 규칙.
 * - 첫 요소는 도메인, 두 번째는 조회 종류, 세 번째부터 파라미터
 * - 무효화는 가장 얕은 접두사를 쓴다. 예: `queryKeys.submissions.all()`
 */
export const queryKeys = {
  submissions: {
    all: () => ["submissions"] as const,
    list: (params: SubmissionListParams) =>
      ["submissions", "list", params] as const,
    detail: (id: string) => ["submissions", "detail", id] as const,
    summary: (scope: SubmissionListParams["scope"]) =>
      ["submissions", "summary", scope ?? "me"] as const,
  },
  reviews: {
    all: () => ["reviews"] as const,
    pending: (params: Omit<SubmissionListParams, "status" | "scope">) =>
      ["reviews", "pending", params] as const,
    history: (submissionId: string) =>
      ["reviews", "history", submissionId] as const,
  },
  displays: {
    all: () => ["displays"] as const,
    playlist: (deviceId: string) => ["displays", "playlist", deviceId] as const,
  },
} as const;
