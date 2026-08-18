import { mockContents } from "@/data/mockContents";
import type { ReviewDto } from "@/entities/review/model/types";
import { toSignageSubmissionExpandedDto } from "@/entities/submission";
import type { SignageSubmissionExpandedDto } from "@/entities/submission/model/types";

/**
 * 개발·테스트 전용 fixture. production 번들에 포함되지 않도록
 * mock adapter를 통해서만 참조한다.
 *
 * 기존 프로토타입 목 데이터를 새 모델로 변환한 뒤,
 * 프로토타입에 없던 상태(반려·중단·작성 중)를 덧붙여 전체 상태 모델을 덮는다.
 */
const base: SignageSubmissionExpandedDto[] = mockContents.map(
  toSignageSubmissionExpandedDto,
);

function derive(
  source: SignageSubmissionExpandedDto,
  overrides: Partial<SignageSubmissionExpandedDto>,
): SignageSubmissionExpandedDto {
  return { ...source, ...overrides };
}

const extras: SignageSubmissionExpandedDto[] = [
  derive(base[0]!, {
    id: "notice-901",
    title: "여름 계절학기 수강 안내",
    status: "REJECTED",
    subtitle: "반려 사유 확인이 필요한 신청",
  }),
  derive(base[1]!, {
    id: "notice-902",
    title: "임시 저장한 동아리 홍보",
    status: "DRAFT",
    subtitle: null,
  }),
  derive(base[2]!, {
    id: "notice-903",
    title: "중단된 외부 행사 안내",
    status: "SUSPENDED",
    subtitle: null,
  }),
];

export const submissionFixtures: SignageSubmissionExpandedDto[] = [
  ...base,
  ...extras,
];

export const reviewFixtures: ReviewDto[] = [
  {
    id: "review-901",
    submissionId: "notice-901",
    revision: 1,
    decision: "REJECTED",
    reasonCode: "INFO_MISMATCH",
    comment: "포스터의 신청 마감일과 Ziggle 공지 본문의 마감일이 다릅니다.",
    reviewerId: "reviewer-house-a",
    reviewedAt: "2026-06-01T02:00:00.000Z",
  },
  {
    id: "review-902",
    submissionId: "notice-903",
    revision: 1,
    decision: "APPROVED",
    reasonCode: null,
    comment: null,
    reviewerId: "reviewer-house-a",
    reviewedAt: "2026-05-28T05:30:00.000Z",
  },
];
