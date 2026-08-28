import { mockContents } from "@/data/mockContents";
import type { ReviewDto } from "@/entities/review/model/types";
import { toSignageSubmissionExpandedDto } from "@/entities/submission";
import type {
  SignageSubmissionExpandedDto,
  SubmissionStatus,
} from "@/entities/submission/model/types";
import { toIsoUtc } from "@/shared/lib/datetime";

/**
 * 개발·테스트 전용 fixture. production 번들에 포함되지 않도록
 * mock adapter를 통해서만 참조한다.
 *
 * 게시 기간은 **기준 시각에 상대적으로** 만든다. 고정 날짜를 쓰면 시간이 지날수록
 * 모든 항목이 만료되어 화면이 비어 버린다. 상태와 기간을 함께 보는 편성 규칙
 * (명세 FR-PLY-01)을 실제로 확인하려면 기간이 살아 있어야 한다.
 */
const DAY_MS = 24 * 60 * 60 * 1000;

const days = (now: Date, offset: number) => new Date(now.getTime() + offset * DAY_MS);

/** 상태별 게시 기간. [시작 offset(일), 종료 offset(일)] */
const PERIOD_BY_STATUS: Partial<Record<SubmissionStatus, [number, number]>> = {
  PUBLISHED: [-3, 11],
  SCHEDULED: [4, 18],
  PENDING_REVIEW: [2, 16],
  ENDED: [-24, -6],
  REJECTED: [3, 17],
  DRAFT: [7, 21],
  SUSPENDED: [-2, 12],
};

function withPeriod(
  dto: SignageSubmissionExpandedDto,
  now: Date,
): SignageSubmissionExpandedDto {
  const period = PERIOD_BY_STATUS[dto.status];
  if (!period) return dto;
  const [startOffset, endOffset] = period;
  return {
    ...dto,
    startAt: toIsoUtc(days(now, startOffset)),
    endAt: toIsoUtc(days(now, endOffset)),
    createdAt: toIsoUtc(days(now, startOffset - 7)),
    updatedAt: toIsoUtc(days(now, startOffset - 7)),
  };
}

/**
 * 기존 프로토타입 목 데이터를 새 모델로 변환한 뒤, 프로토타입에 없던 상태
 * (반려·중단·작성 중)를 덧붙여 전체 상태 모델을 덮는다.
 */
export function createSubmissionFixtures(
  now: Date,
): SignageSubmissionExpandedDto[] {
  const base = mockContents.map(toSignageSubmissionExpandedDto);

  const extras: SignageSubmissionExpandedDto[] = [
    {
      ...base[0]!,
      id: "notice-901",
      title: "슈퍼-피셜 신입 부원 모집",
      subtitle: "그림 그리는 사람들의 모임",
      categoryId: "동아리",
      categoryName: "동아리",
      organizationName: "슈퍼-피셜",
      posterUrl: "/posters/superficial.webp",
      status: "REJECTED",
    },
    {
      ...base[1]!,
      id: "notice-902",
      title: "임시 저장한 동아리 홍보",
      subtitle: null,
      posterUrl: "",
      status: "DRAFT",
    },
    {
      ...base[2]!,
      id: "notice-903",
      title: "여름 계절학기 수강 안내",
      subtitle: null,
      organizationName: "학사지원팀",
      status: "SUSPENDED",
    },
  ];

  return [...base, ...extras].map((dto) => withPeriod(dto, now));
}

export function createReviewFixtures(now: Date): ReviewDto[] {
  return [
    {
      id: "review-901",
      submissionId: "notice-901",
      revision: 1,
      decision: "REJECTED",
      reasonCode: "INFO_MISMATCH",
      comment: "포스터의 신청 마감일과 Ziggle 공지 본문의 마감일이 다릅니다.",
      reviewerId: "reviewer-house-a",
      reviewerName: "하우스 관리자",
      reviewedAt: toIsoUtc(days(now, -2)),
    },
    {
      id: "review-902",
      submissionId: "notice-903",
      revision: 1,
      decision: "APPROVED",
      reasonCode: null,
      comment: null,
      reviewerId: "reviewer-house-a",
      reviewerName: "하우스 관리자",
      reviewedAt: toIsoUtc(days(now, -6)),
    },
    {
      id: "review-903",
      submissionId: "notice-903",
      revision: 2,
      decision: "SUSPENDED",
      reasonCode: null,
      comment: "수강 신청 일정이 변경되어 안내를 잠시 내립니다.",
      reviewerId: "reviewer-house-a",
      reviewerName: "하우스 관리자",
      reviewedAt: toIsoUtc(days(now, -1)),
    },
  ];
}
