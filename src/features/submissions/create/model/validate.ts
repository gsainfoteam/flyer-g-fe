import { isKnownCategory } from "@/entities/submission";
import { InvalidDateError, fromSeoulInput } from "@/shared/lib/datetime";
import { isAllowedZiggleUrl } from "@/shared/lib/ziggle-url";
import type { SubmissionDraft } from "./draft";

/**
 * 게시 신청 폼 검증 (명세 FR-SUB-02).
 *
 * 순수 함수다. 서버가 최종 판단하지만(명세 9.4), 사용자가 10MB를 올린 뒤에야
 * 거절당하지 않도록 같은 규칙을 화면에서도 본다.
 */
export const TITLE_MAX_LENGTH = 80;

export type SubmissionFieldName =
  | "notice"
  | "title"
  | "categoryId"
  | "startAt"
  | "endAt"
  | "detailUrl"
  | "asset";

export type SubmissionFieldErrors = Partial<
  Record<SubmissionFieldName, string>
>;

export interface SubmissionFormValues extends SubmissionDraft {
  /** 연결된 Ziggle 공지. 없으면 신청 자체가 불가능하다. */
  ziggleNoticeId: string | null;
  /** 업로드가 끝난 포스터. 업로드 중이거나 실패면 null이다. */
  assetId: string | null;
}

export interface ValidateOptions {
  /** 과거 종료 판정의 기준 시각. 클라이언트 시계를 직접 읽지 않는다. */
  now: Date;
}

function parseSeoul(value: string): Date | null {
  if (value.trim().length === 0) return null;
  try {
    return fromSeoulInput(value);
  } catch (error) {
    if (error instanceof InvalidDateError) return null;
    throw error;
  }
}

export function validateSubmissionForm(
  values: SubmissionFormValues,
  { now }: ValidateOptions,
): SubmissionFieldErrors {
  const errors: SubmissionFieldErrors = {};

  if (!values.ziggleNoticeId) {
    errors.notice = "Ziggle 공지를 먼저 연결해 주세요.";
  }

  const title = values.title.trim();
  if (title.length === 0) {
    errors.title = "제목을 입력해 주세요.";
  } else if (title.length > TITLE_MAX_LENGTH) {
    errors.title = `제목은 ${TITLE_MAX_LENGTH}자까지 쓸 수 있어요. 지금 ${title.length}자입니다.`;
  }

  if (values.categoryId.length === 0) {
    errors.categoryId = "카테고리를 선택해 주세요.";
  } else if (!isKnownCategory(values.categoryId)) {
    errors.categoryId = "선택할 수 없는 카테고리예요.";
  }

  const startAt = parseSeoul(values.startAt);
  const endAt = parseSeoul(values.endAt);

  if (startAt === null) {
    errors.startAt = "게시 시작 시각을 입력해 주세요.";
  }

  if (endAt === null) {
    errors.endAt = "게시 종료 시각을 입력해 주세요.";
  } else if (endAt.getTime() <= now.getTime()) {
    errors.endAt = "종료 시각은 현재보다 뒤여야 해요.";
  } else if (startAt !== null && endAt.getTime() <= startAt.getTime()) {
    errors.endAt = "종료 시각은 시작 시각보다 뒤여야 해요.";
  }

  if (values.detailUrl.trim().length === 0) {
    errors.detailUrl = "Ziggle 상세 링크가 필요해요.";
  } else if (!isAllowedZiggleUrl(values.detailUrl.trim())) {
    errors.detailUrl = "공식 Ziggle 주소(https://ziggle.gistory.me)만 쓸 수 있어요.";
  }

  if (!values.assetId) {
    errors.asset = "포스터 이미지를 올려 주세요.";
  }

  return errors;
}

export function hasFieldErrors(errors: SubmissionFieldErrors): boolean {
  return Object.keys(errors).length > 0;
}

/**
 * 제출 버튼을 눌렀을 때 위에 한 줄로 보여줄 요약.
 * 화면 아래쪽 필드 오류를 놓치는 것을 막는다.
 */
export function summarizeErrors(errors: SubmissionFieldErrors): string | null {
  const count = Object.keys(errors).length;
  if (count === 0) return null;
  return `입력을 확인해 주세요. ${count}개 항목에 문제가 있어요.`;
}
