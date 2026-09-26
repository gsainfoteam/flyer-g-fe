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

/**
 * 폼에 없지만 TV에 나오는 값(주최·부제·장소)의 출처. 새 신청은 연결한 공지,
 * 수정은 이미 저장된 신청에서 온다. 어느 쪽이든 서버가 채우는 값이라 사용자가
 * 고치지 않는다.
 */
export interface PreviewSource {
  id: string;
  organizationName: string | null;
  subtitle: string | null;
  location: string | null;
}

export function previewSourceFromNotice(notice: ZiggleNotice): PreviewSource {
  return {
    id: notice.id,
    organizationName: notice.organizationName,
    subtitle: notice.summary,
    location: notice.location,
  };
}

export interface DraftPreviewInput {
  draft: SubmissionDraft;
  source: PreviewSource | null;
  /** 업로드 전 로컬 blob URL이어도 된다. 없으면 포스터 자리를 비운다. */
  posterUrl: string | null;
  /** 날짜를 읽지 못했을 때 대신 쓸 시각. 모르면 null. */
  now: Date | null;
}

export function draftToPosterRenderModel({
  draft,
  source,
  posterUrl,
  now,
}: DraftPreviewInput): PosterRenderModel {
  // TV는 게시 기간을 그리지 않는다. 날짜는 표시 모델을 채우는 데만 쓴다.
  const startAt = parseOr(draft.startAt, now ?? new Date(0));
  const endAt = parseOr(draft.endAt, startAt);

  return {
    id: source?.id ?? "preview",
    title: draft.title.trim() || PREVIEW_PLACEHOLDER_TITLE,
    subtitle: source?.subtitle ?? null,
    categoryName: draft.categoryId ? getCategoryName(draft.categoryId) : "미분류",
    organizationName: source?.organizationName ?? "",
    location: source?.location ?? null,
    posterUrl: posterUrl ?? "",
    detailUrl: draft.detailUrl.trim(),
    startAt,
    endAt,
  };
}
