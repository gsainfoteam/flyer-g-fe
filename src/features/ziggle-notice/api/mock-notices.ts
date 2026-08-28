import type { ZiggleNotice } from "@/entities/notice";
import { ApiError } from "@/shared/api/error";
import type { Clock } from "@/shared/lib/clock";
import { systemClock } from "@/shared/lib/clock";
import { ZIGGLE_ORIGIN } from "@/shared/lib/ziggle-url";
import { withInjection } from "@/mocks/injection";
import type { ZiggleNoticeAdapter } from "./notice-adapter";

/**
 * 개발·테스트용 공지 목록.
 *
 * 실제 운영 데이터처럼 보이는 개인 정보를 넣지 않는다. 조직명과 행사는 모두
 * 가상이며, 실제 공지 ID 체계를 흉내 내지도 않는다.
 */
const DAY_MS = 24 * 60 * 60 * 1000;

interface NoticeSeed {
  id: string;
  title: string;
  categoryId: string;
  organizationName: string | null;
  summary: string | null;
  location: string | null;
  /** 기준 시각으로부터 며칠 전에 올라온 공지인가 */
  publishedDaysAgo: number;
}

const SEEDS: readonly NoticeSeed[] = [
  {
    id: "notice-1041",
    title: "겨울 정기 공연 〈한밤의 물리학〉",
    categoryId: "performance",
    organizationName: "가상 공연동아리 페이드인",
    summary: "12월 셋째 주 금요일 저녁, 대강당",
    location: "대강당",
    publishedDaysAgo: 1,
  },
  {
    id: "notice-1038",
    title: "기숙사 분리배출 방식 변경 안내",
    categoryId: "notice",
    organizationName: "가상 생활관운영팀",
    summary: "1월부터 층별 분리배출 위치가 바뀝니다",
    location: null,
    publishedDaysAgo: 3,
  },
  {
    id: "notice-1032",
    title: "신입 부원 모집 · 로봇제작동아리",
    categoryId: "club",
    organizationName: "가상 로봇동아리 기어박스",
    summary: "전공 무관, 주 1회 정기 모임",
    location: "학생회관 302호",
    publishedDaysAgo: 6,
  },
  {
    id: "notice-1027",
    title: "겨울 계절학기 수강 신청 일정",
    categoryId: "department",
    organizationName: "가상 학사지원팀",
    summary: null,
    location: null,
    publishedDaysAgo: 9,
  },
];

function toNotice(seed: NoticeSeed, now: Date): ZiggleNotice {
  return {
    id: seed.id,
    title: seed.title,
    categoryId: seed.categoryId,
    organizationName: seed.organizationName,
    detailUrl: `${ZIGGLE_ORIGIN}/notice/${seed.id}`,
    summary: seed.summary,
    location: seed.location,
    publishedAt: new Date(now.getTime() - seed.publishedDaysAgo * DAY_MS),
  };
}

export interface MockNoticeOptions {
  clock?: Clock;
  latencyMs?: number;
}

export function createMockNoticeAdapter(
  options: MockNoticeOptions = {},
): ZiggleNoticeAdapter {
  const clock = options.clock ?? systemClock;
  const latencyMs = options.latencyMs ?? 0;

  const settle = async (signal?: AbortSignal) => {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    if (latencyMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, latencyMs));
    }
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
  };

  return withInjection<ZiggleNoticeAdapter>("notices", {
    async getById(noticeId, signal) {
      await settle(signal);
      const seed = SEEDS.find((item) => item.id === noticeId);
      if (!seed) {
        // 실제로는 서버가 없음과 권한 없음을 구분한다. mock은 없음만 흉내 낸다.
        throw new ApiError({
          kind: "http",
          code: "NOT_FOUND",
          message: `공지를 찾을 수 없습니다: ${noticeId}`,
          status: 404,
          requestId: "mock-request",
        });
      }
      return toNotice(seed, clock.now());
    },

    async listSubmittable(signal) {
      await settle(signal);
      const now = clock.now();
      return SEEDS.map((seed) => toNotice(seed, now));
    },
  });
}
