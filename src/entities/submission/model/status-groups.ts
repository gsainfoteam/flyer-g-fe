import type { SubmissionStatus } from "./types";

/**
 * 목록 화면의 상태 탭 (명세 FR-DASH-02).
 *
 * 탭 하나가 상태 여러 개를 묶는다. "승인/예약"을 나누면 게시자에게는 같은 의미
 * ("이제 기다리면 걸린다")가 두 칸으로 흩어진다. 서버 필터도 복수 상태를 받아야
 * 하는 이유다. (`API-REQUIREMENTS.md` 5.4)
 *
 * ARCHIVED는 어느 탭에도 넣지 않는다. 보관은 운영 목록에서 숨기는 것이 목적이다.
 * (명세 6.3)
 */
export interface StatusGroup {
  key: string;
  label: string;
  /** 빈 배열이면 "전체" — ARCHIVED를 뺀 모든 상태 */
  statuses: readonly SubmissionStatus[];
}

export const STATUS_GROUPS: readonly StatusGroup[] = [
  { key: "all", label: "전체", statuses: [] },
  { key: "draft", label: "작성 중", statuses: ["DRAFT"] },
  { key: "pending", label: "승인 대기", statuses: ["PENDING_REVIEW"] },
  { key: "rejected", label: "반려", statuses: ["REJECTED"] },
  { key: "approved", label: "승인/예약", statuses: ["APPROVED", "SCHEDULED"] },
  { key: "published", label: "게시 중", statuses: ["PUBLISHED"] },
  { key: "ended", label: "종료", statuses: ["ENDED"] },
  { key: "stopped", label: "중단/취소", statuses: ["SUSPENDED", "CANCELED"] },
] as const;


/** 알 수 없는 key(오래된 링크, 오타)는 전체 탭으로 조용히 돌아간다. */
export function findStatusGroup(key: string | null | undefined): StatusGroup {
  return (
    STATUS_GROUPS.find((group) => group.key === key) ?? STATUS_GROUPS[0]!
  );
}

/** 상태가 속한 그룹. 목록 행에서 "이 탭으로 이동" 같은 연결에 쓴다. */
export function groupOfStatus(status: SubmissionStatus): StatusGroup {
  return (
    STATUS_GROUPS.find((group) => group.statuses.includes(status)) ??
    STATUS_GROUPS[0]!
  );
}

/**
 * 요약의 상태별 건수를 탭별 건수로 묶는다. "전체"는 보관을 뺀 모든 상태다.
 * 화면이 불러온 페이지로 세지 않는다 — pagination 때문에 틀린 숫자가 된다.
 */
export function countByStatusGroup(
  byStatus: Record<SubmissionStatus, number>,
): Record<string, number> {
  return Object.fromEntries(
    STATUS_GROUPS.map((group) => [
      group.key,
      group.statuses.length === 0
        ? Object.entries(byStatus)
            .filter(([status]) => status !== "ARCHIVED")
            .reduce((sum, [, count]) => sum + count, 0)
        : group.statuses.reduce((sum, status) => sum + byStatus[status], 0),
    ]),
  );
}
