import type { PosterRenderModel } from "@/entities/poster";
import type { Category } from "@/entities/submission";
import { InvalidDateError, fromSeoulInput } from "@/shared/lib/datetime";
import type { SubmissionDraft } from "@/features/submissions/create/model/draft";
import { optionalText } from "@/features/submissions/create/model/draft";

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
  /** 고치는 신청의 id. 새 신청이면 null */
  submissionId: string | null;
  /** 카테고리 이름을 찾을 목록. 아직 모르면 빈 배열 */
  categories: readonly Category[];
  /** 업로드 전 로컬 blob URL이어도 된다. 없으면 포스터 자리를 비운다. */
  posterUrl: string | null;
  /** 날짜를 읽지 못했을 때 대신 쓸 시각. 모르면 null. */
  now: Date | null;
}

export function draftToPosterRenderModel({
  draft,
  submissionId,
  categories,
  posterUrl,
  now,
}: DraftPreviewInput): PosterRenderModel {
  // TV는 게시 기간을 그리지 않는다. 날짜는 표시 모델을 채우는 데만 쓴다.
  const startAt = parseOr(draft.startAt, now ?? new Date(0));
  const endAt = parseOr(draft.endAt, startAt);
  const category = categories.find((item) => item.id === draft.categoryId);

  return {
    id: submissionId ?? "preview",
    title: draft.title.trim() || PREVIEW_PLACEHOLDER_TITLE,
    subtitle: optionalText(draft.subtitle),
    categoryName: category?.name ?? "미분류",
    organizerName: optionalText(draft.organizerName),
    location: optionalText(draft.location),
    posterUrl: posterUrl ?? "",
    detailUrl: optionalText(draft.detailUrl),
    startAt,
    endAt,
  };
}
