import { fromSeoulInput, toIsoUtc } from "@/shared/lib/datetime";
import { normalizeLegacyZiggleUrl } from "@/shared/lib/ziggle-url";
import type { ContentStatus, NoticeContent } from "@/types/content";
import type { SignageSubmissionExpandedDto, SubmissionStatus } from "./types";

/**
 * 초기 프로토타입의 `NoticeContent`를 새 도메인 모델로 옮기는 호환 adapter.
 * 화면 전환이 끝나면 제거한다. 새 코드는 이 타입을 직접 쓰지 않는다.
 *
 * `views`, `likes`는 의미가 불명확한 목 값이므로 옮기지 않는다. 명세 FR-DASH-01
 */
const STATUS_MAP: Record<ContentStatus, SubmissionStatus> = {
  published: "PUBLISHED",
  scheduled: "SCHEDULED",
  pending: "PENDING_REVIEW",
  ended: "ENDED",
};

/** 명세 10.2 기본 게시 기간 최대 14일. 종료일이 없는 목 데이터의 보정값이다. */
const DEFAULT_PERIOD_DAYS = 14;

function slugFromUrl(url: string, fallback: string): string {
  const segments = url.split("/").filter(Boolean);
  return segments[segments.length - 1] ?? fallback;
}

export function toSignageSubmissionExpandedDto(
  content: NoticeContent,
): SignageSubmissionExpandedDto {
  const startAt = fromSeoulInput(content.startDate);
  const endAt = content.endDate
    ? fromSeoulInput(`${content.endDate}T23:59`)
    : new Date(startAt.getTime() + DEFAULT_PERIOD_DAYS * 24 * 60 * 60 * 1000);
  const detailUrl = normalizeLegacyZiggleUrl(content.linkUrl);

  return {
    id: content.id,
    ziggleNoticeId: slugFromUrl(detailUrl, content.id),
    requesterId: `requester-${content.id}`,
    organizationId: null,
    type: "POSTER",
    title: content.title,
    categoryId: content.category,
    assetId: `asset-${content.id}`,
    detailUrl,
    startAt: toIsoUtc(startAt),
    endAt: toIsoUtc(endAt),
    status: STATUS_MAP[content.status],
    priority: 0,
    targetGroupIds: ["group-house-a"],
    createdAt: toIsoUtc(startAt),
    updatedAt: toIsoUtc(startAt),
    version: 1,
    categoryName: content.category,
    organizationName: content.organizer,
    posterUrl: content.posterUrl,
    subtitle: content.subtitle ?? null,
    location: content.location ?? null,
    description: content.description ?? null,
  };
}
