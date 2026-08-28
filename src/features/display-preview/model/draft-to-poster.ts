import type { ZiggleNotice } from "@/entities/notice";
import type { PosterRenderModel } from "@/entities/poster";
import { getCategoryName } from "@/entities/submission";
import { InvalidDateError, fromSeoulInput } from "@/shared/lib/datetime";
import type { SubmissionDraft } from "@/features/submissions/create/model/draft";

/**
 * 작성 중인 폼을 미리보기용 표시 모델로 바꾼다.
 *
 * 아직 유효하지 않은 입력에도 무언가는 그려야 한다. 폼을 다 채워야 미리보기가
 * 나타나면 정작 확인하고 싶은 "제목이 길면 어떻게 보이는가"를 볼 수 없다.
 * 빈 값은 자리표시자로 채우고, 잘못된 날짜는 기준 시각으로 대신한다.
 */
export const PREVIEW_PLACEHOLDER_TITLE = "제목을 입력하면 여기에 보입니다";

function parseOr(value: string, fallback: Date): Date {
  if (value.trim().length === 0) return fallback;
  try {
    return fromSeoulInput(value);
  } catch (error) {
    if (error instanceof InvalidDateError) return fallback;
    throw error;
  }
}

export interface DraftPreviewInput {
  draft: SubmissionDraft;
  notice: ZiggleNotice | null;
  /** 업로드 전 로컬 blob URL이어도 된다. 없으면 포스터 자리를 비운다. */
  posterUrl: string | null;
  now: Date;
}

export function draftToPosterRenderModel({
  draft,
  notice,
  posterUrl,
  now,
}: DraftPreviewInput): PosterRenderModel {
  const startAt = parseOr(draft.startAt, now);
  const endAt = parseOr(draft.endAt, startAt);

  return {
    id: notice?.id ?? "preview",
    title: draft.title.trim() || PREVIEW_PLACEHOLDER_TITLE,
    subtitle: notice?.summary ?? null,
    categoryName: draft.categoryId ? getCategoryName(draft.categoryId) : "미분류",
    organizationName: notice?.organizationName ?? "",
    location: notice?.location ?? null,
    posterUrl: posterUrl ?? "",
    detailUrl: draft.detailUrl.trim(),
    startAt,
    endAt,
  };
}
