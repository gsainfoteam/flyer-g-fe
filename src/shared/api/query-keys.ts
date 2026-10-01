import type { SubmissionListParams } from "@/entities/submission/model/types";
import type { ImpressionStatsParams } from "@/entities/impression/model/types";
import type { UserListParams } from "@/entities/user/model/types";
import type { PendingReviewParams } from "./repositories";

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
    infinite: (params: Omit<SubmissionListParams, "cursor">) =>
      ["submissions", "infinite", params] as const,
    detail: (id: string) => ["submissions", "detail", id] as const,
    summary: (scope: SubmissionListParams["scope"]) =>
      ["submissions", "summary", scope ?? "me"] as const,
  },
  reviews: {
    all: () => ["reviews"] as const,
    pending: (params: PendingReviewParams) =>
      ["reviews", "pending", params] as const,
    pendingInfinite: (params: Omit<PendingReviewParams, "cursor">) =>
      ["reviews", "pending-infinite", params] as const,
    history: (submissionId: string) =>
      ["reviews", "history", submissionId] as const,
    recentDecisions: (limit: number) =>
      ["reviews", "recent-decisions", limit] as const,
  },
  displays: {
    all: () => ["displays"] as const,
    playlist: (deviceId: string) => ["displays", "playlist", deviceId] as const,
  },
  devices: {
    all: () => ["devices"] as const,
    list: () => ["devices", "list"] as const,
  },
  stats: {
    all: () => ["stats"] as const,
    impressions: (params: ImpressionStatsParams) =>
      ["stats", "impressions", params] as const,
  },
  users: {
    all: () => ["users"] as const,
    /** 한 역할을 받은 사람 전부 (여러 페이지를 이어 받은 결과) */
    holders: (role: UserListParams["role"]) =>
      ["users", "holders", role] as const,
    infinite: (params: Omit<UserListParams, "cursor">) =>
      ["users", "infinite", params] as const,
  },
  reference: {
    all: () => ["reference"] as const,
    config: () => ["reference", "config"] as const,
    categories: () => ["reference", "categories"] as const,
    targetGroups: () => ["reference", "target-groups"] as const,
  },
} as const;
