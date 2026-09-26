import type {
  DisplayDeviceDto,
  TargetGroup,
} from "@/entities/device/model/types";
import type { ReviewDto } from "@/entities/review/model/types";
import { getCategoryName } from "@/entities/submission/model/categories";
import type {
  SignageSubmissionExpandedDto,
  SubmissionStatus,
} from "@/entities/submission/model/types";
import { toIsoUtc } from "@/shared/lib/datetime";
import { ZIGGLE_ORIGIN } from "@/shared/lib/ziggle-url";
import { MOCK_ORGANIZATIONS, MOCK_USERS } from "./users";

/**
 * 개발·테스트 전용 fixture. production 번들에 포함되지 않도록
 * mock adapter를 통해서만 참조한다.
 *
 * 게시 기간은 **기준 시각에 상대적으로** 만든다. 고정 날짜를 쓰면 시간이 지날수록
 * 모든 항목이 만료되어 화면이 비어 버린다. 상태와 기간을 함께 보는 편성 규칙
 * (명세 FR-PLY-01)을 실제로 확인하려면 기간이 살아 있어야 한다.
 *
 * 소유자는 역할 전환으로 로그인할 수 있는 사람(`users.ts`)과 이어진다.
 * - 게시자 정하윤: 게시 중·승인 대기·반려·작성 중·중단·종료를 하나씩 가진다.
 * - 하우스 관리자 이수현: 하우스오피스 공지 한 건을 직접 신청했다.
 * - 나머지는 로그인할 수 없는 다른 신청자다.
 */
const DAY_MS = 24 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

const days = (now: Date, offset: number) => new Date(now.getTime() + offset * DAY_MS);

export const TARGET_GROUP_FIXTURES: readonly TargetGroup[] = [
  { id: "group-house-a", name: "학사기숙사 A동", deviceCount: 1 },
  { id: "group-house-b", name: "학사기숙사 B동", deviceCount: 1 },
];

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

/** 한 번 승인을 거친 상태. 승인 이력을 함께 만든다. */
const APPROVED_ONCE: readonly SubmissionStatus[] = [
  "APPROVED",
  "SCHEDULED",
  "PUBLISHED",
  "ENDED",
  "SUSPENDED",
];

interface SubmissionSeed {
  id: string;
  /** Ziggle 공지 식별자. 상세 링크(QR)도 여기서 만든다. */
  noticeSlug: string;
  requesterId: string;
  organization: { id: string; name: string };
  title: string;
  categoryId: string;
  status: SubmissionStatus;
  posterUrl: string;
  subtitle: string | null;
  location: string | null;
  description: string | null;
  targetGroupIds?: string[];
}

const SEEDS: readonly SubmissionSeed[] = [
  {
    id: "notice-001",
    noticeSlug: "vesper-recital",
    requesterId: MOCK_USERS.SUBMITTER.id,
    organization: MOCK_ORGANIZATIONS.piano,
    title: "VESPER 피아노 정기공연",
    categoryId: "performance",
    status: "PUBLISHED",
    posterUrl: "/posters/vesper.webp",
    subtitle: "여름밤의 피아노 리사이틀",
    location: "중앙도서관 소극장",
    description: "여름밤에 어울리는 피아노 소품과 재즈 편곡을 준비했습니다.",
  },
  {
    id: "notice-002",
    noticeSlug: "research-assistant",
    requesterId: "user-ibs-lab",
    organization: { id: "org-ibs-lab", name: "IBS 양자변환연구단" },
    title: "연구보조 학생 모집",
    categoryId: "notice",
    status: "PUBLISHED",
    posterUrl: "/posters/research-assistant.webp",
    subtitle: "양자변환연구단 학부 연구 참여",
    location: "온라인 접수",
    description: "학기 중 주 10시간 내외로 연구를 보조할 학부생을 찾습니다.",
    targetGroupIds: ["group-house-a"],
  },
  {
    id: "notice-003",
    noticeSlug: "gist-news-22",
    requesterId: "user-gist-news",
    organization: { id: "org-gist-news", name: "지스트신문" },
    title: "지스트신문 22기 기자단 모집",
    categoryId: "club",
    status: "PENDING_REVIEW",
    posterUrl: "/posters/gist-news.webp",
    subtitle: "캠퍼스의 기록을 함께 남길 사람",
    location: "온라인 접수",
    description: "취재, 사진, 편집 세 부문에서 신입 기자를 모집합니다.",
    targetGroupIds: ["group-house-a"],
  },
  {
    id: "notice-004",
    noticeSlug: "rnd-officer",
    requesterId: "user-student-support",
    organization: { id: "org-student-support", name: "학생지원센터" },
    title: "과학기술전문사관 석사 후보생 모집",
    categoryId: "notice",
    status: "SCHEDULED",
    posterUrl: "/posters/rnd-officer.webp",
    subtitle: "2027년도 선발 안내",
    location: "대학 C동 201호",
    description: "지원 자격과 제출 서류, 설명회 일정을 안내합니다.",
  },
  {
    id: "notice-005",
    noticeSlug: "house-office-notice",
    requesterId: MOCK_USERS.REVIEWER.id,
    organization: MOCK_ORGANIZATIONS.houseOffice,
    title:
      "2026학년도 2학기 기숙사 디지털 게시판 게시 신청 안내 및 승인 절차 변경 공지",
    categoryId: "notice",
    status: "PENDING_REVIEW",
    posterUrl: "/posters/rnd-officer.webp",
    subtitle: "신청 방법이 바뀝니다",
    location: "학사기숙사 A동, B동",
    description:
      "이번 학기부터 게시 신청은 Ziggle 공지 작성 화면에서 함께 진행합니다.",
  },
  {
    id: "notice-006",
    noticeSlug: "band-live",
    requesterId: "user-band",
    organization: { id: "org-band", name: "도백 도둑" },
    title: "도백 도둑 정기공연",
    categoryId: "performance",
    status: "SCHEDULED",
    posterUrl: "/posters/vesper.webp",
    subtitle: "여름밤 밴드 라이브",
    location: "오룡관 소극장",
    description: "기숙사에서 가까운 소극장에서 여는 밴드 정기공연입니다.",
    targetGroupIds: ["group-house-b"],
  },
  {
    id: "notice-007",
    noticeSlug: "earth-club",
    requesterId: "user-earth-club",
    organization: { id: "org-earth-club", name: "지구는 처음이야" },
    title: "지구는 처음이야 동아리 부스",
    categoryId: "club",
    status: "ENDED",
    posterUrl: "/posters/superficial.webp",
    subtitle: "환경 동아리 신입 부원 모집",
    location: "제1학생회관 로비",
    description: "업사이클링 워크숍과 캠퍼스 플로깅을 함께할 부원을 모집합니다.",
  },
  {
    // 포스터를 불러오지 못하는 경우의 대체 화면을 확인하기 위해 이미지를 비워 둔다.
    id: "notice-008",
    noticeSlug: "open-club-room",
    requesterId: "user-club-union",
    organization: { id: "org-club-union", name: "GIST 동아리연합회" },
    title: "오픈 동방",
    categoryId: "event",
    status: "ENDED",
    posterUrl: "",
    subtitle: "동아리방 투어 주간",
    location: "학생회관 2층",
    description: "동아리방을 하루 동안 열어 두고 자유롭게 둘러볼 수 있습니다.",
  },
  {
    id: "notice-901",
    noticeSlug: "superficial-recruit",
    requesterId: MOCK_USERS.SUBMITTER.id,
    organization: MOCK_ORGANIZATIONS.superficial,
    title: "슈퍼-피셜 신입 부원 모집",
    categoryId: "club",
    status: "REJECTED",
    posterUrl: "/posters/superficial.webp",
    subtitle: "그림 그리는 사람들의 모임",
    location: "학생회관 305호",
    description: null,
  },
  {
    id: "notice-902",
    noticeSlug: "superficial-sketch-day",
    requesterId: MOCK_USERS.SUBMITTER.id,
    organization: MOCK_ORGANIZATIONS.superficial,
    title: "슈퍼-피셜 야외 스케치 데이",
    categoryId: "event",
    status: "DRAFT",
    posterUrl: "",
    subtitle: null,
    location: null,
    description: null,
  },
  {
    id: "notice-903",
    noticeSlug: "superficial-one-day-class",
    requesterId: MOCK_USERS.SUBMITTER.id,
    organization: MOCK_ORGANIZATIONS.superficial,
    title: "슈퍼-피셜 드로잉 원데이 클래스",
    categoryId: "event",
    status: "SUSPENDED",
    posterUrl: "/posters/superficial.webp",
    subtitle: "처음 그리는 사람도 환영",
    location: "학생회관 305호",
    description: null,
  },
  {
    id: "notice-904",
    noticeSlug: "vesper-spring",
    requesterId: MOCK_USERS.SUBMITTER.id,
    organization: MOCK_ORGANIZATIONS.piano,
    title: "VESPER 봄 정기공연",
    categoryId: "performance",
    status: "ENDED",
    posterUrl: "/posters/vesper.webp",
    subtitle: "봄밤의 피아노",
    location: "중앙도서관 소극장",
    description: null,
  },
  {
    id: "notice-905",
    noticeSlug: "superficial-exhibition",
    requesterId: MOCK_USERS.SUBMITTER.id,
    organization: MOCK_ORGANIZATIONS.superficial,
    title: "슈퍼-피셜 가을 전시 〈선 긋기〉",
    categoryId: "event",
    status: "PENDING_REVIEW",
    posterUrl: "/posters/superficial.webp",
    subtitle: "동아리 부원 20명의 드로잉",
    location: "학생회관 1층 갤러리",
    description: null,
  },
];

/** 신청이 거쳐 온 검토 횟수만큼 version이 올라가 있다. */
function versionOf(status: SubmissionStatus): number {
  if (status === "SUSPENDED") return 3;
  if (status === "REJECTED" || APPROVED_ONCE.includes(status)) return 2;
  return 1;
}

function toDto(seed: SubmissionSeed, now: Date): SignageSubmissionExpandedDto {
  const [startOffset, endOffset] = PERIOD_BY_STATUS[seed.status] ?? [7, 21];
  const createdAt = toIsoUtc(days(now, startOffset - 7));

  return {
    id: seed.id,
    ziggleNoticeId: seed.noticeSlug,
    requesterId: seed.requesterId,
    organizationId: seed.organization.id,
    type: "POSTER",
    title: seed.title,
    categoryId: seed.categoryId,
    assetId: `asset-${seed.id}`,
    detailUrl: `${ZIGGLE_ORIGIN}/notice/${seed.noticeSlug}`,
    startAt: toIsoUtc(days(now, startOffset)),
    endAt: toIsoUtc(days(now, endOffset)),
    status: seed.status,
    priority: 0,
    targetGroupIds: seed.targetGroupIds ?? [],
    createdAt,
    updatedAt: createdAt,
    version: versionOf(seed.status),
    categoryName: getCategoryName(seed.categoryId),
    organizationName: seed.organization.name,
    posterUrl: seed.posterUrl,
    subtitle: seed.subtitle,
    location: seed.location,
    description: seed.description,
  };
}

export function createSubmissionFixtures(
  now: Date,
): SignageSubmissionExpandedDto[] {
  return SEEDS.map((seed) => toDto(seed, now));
}

const REVIEWER = {
  reviewerId: MOCK_USERS.REVIEWER.id,
  reviewerName: MOCK_USERS.REVIEWER.displayName,
};

export function createReviewFixtures(now: Date): ReviewDto[] {
  // 승인을 거친 신청에는 시작 하루 전 승인 기록을 남긴다.
  const approvals: ReviewDto[] = SEEDS.filter((seed) =>
    APPROVED_ONCE.includes(seed.status),
  ).map((seed) => {
    const [startOffset] = PERIOD_BY_STATUS[seed.status] ?? [0, 0];
    return {
      id: `review-approve-${seed.id}`,
      submissionId: seed.id,
      revision: 1,
      decision: "APPROVED",
      reasonCode: null,
      comment: null,
      ...REVIEWER,
      reviewedAt: toIsoUtc(days(now, startOffset - 1)),
    };
  });

  return [
    ...approvals,
    {
      id: "review-reject-notice-901",
      submissionId: "notice-901",
      revision: 1,
      decision: "REJECTED",
      reasonCode: "INFO_MISMATCH",
      comment: "포스터의 신청 마감일과 Ziggle 공지 본문의 마감일이 다릅니다.",
      ...REVIEWER,
      reviewedAt: toIsoUtc(days(now, -2)),
    },
    {
      id: "review-suspend-notice-903",
      submissionId: "notice-903",
      revision: 2,
      decision: "SUSPENDED",
      reasonCode: null,
      comment: "장소 대관이 취소되어 안내를 잠시 내립니다.",
      ...REVIEWER,
      reviewedAt: toIsoUtc(days(now, -1)),
    },
  ];
}

/**
 * 기기 목록. `lastSeenAt`은 mock repository가 heartbeat 기록으로 덮어쓴다.
 *
 * - A동 로비: 1분마다 heartbeat를 보내는 정상 기기로 흉내 낸다.
 * - B동 로비: 26분 전부터 연락이 끊긴 기기다.
 */
export interface DeviceSeed extends Omit<DisplayDeviceDto, "lastSeenAt" | "status"> {
  /** 연락이 끊긴 시점. null이면 계속 heartbeat를 보내는 기기다. */
  silentSinceMs: number | null;
}

export const DEVICE_FIXTURES: readonly DeviceSeed[] = [
  {
    id: "house-a-lobby",
    name: "A동 로비",
    location: "학사기숙사 A동 1층",
    groupIds: ["group-house-a"],
    orientation: "LANDSCAPE",
    resolution: { width: 1920, height: 1080 },
    appVersion: "v0.4.2",
    silentSinceMs: null,
  },
  {
    id: "house-b-lobby",
    name: "B동 로비",
    location: "학사기숙사 B동 1층",
    groupIds: ["group-house-b"],
    orientation: "LANDSCAPE",
    resolution: { width: 1920, height: 1080 },
    appVersion: "v0.4.2",
    silentSinceMs: 26 * MINUTE_MS,
  },
];
