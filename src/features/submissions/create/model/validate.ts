import { checkSchedule, isAllowedDetailUrl } from "@/entities/submission";
import type { Category, SignageConfig } from "@/entities/submission";
import { InvalidDateError, fromSeoulInput } from "@/shared/lib/datetime";
import type { SubmissionDraft } from "./draft";

/**
 * 게시 신청 폼 검증 (명세 FR-SUB-02).
 *
 * 순수 함수다. 서버가 최종 판단하지만(명세 9.4), 사용자가 입력을 다 채운 뒤에야
 * 거절당하지 않도록 서버와 같은 규칙을 화면에서도 본다. 제한값은 서버 설정
 * (`GET /signage/config`)에서 받는다. 아직 받지 못했으면 그 규칙은 서버에 맡긴다.
 */

/**
 * 선택 입력의 최대 글자 수. 서버 DTO의 형식 제한이며 운영 설정에는 없다.
 * (`flyer-g-be` `submission-input.dto.ts`)
 */
export const TEXT_LIMITS = {
  organizerName: 100,
  subtitle: 100,
  location: 100,
  description: 1000,
} as const;

export type SubmissionFieldName =
  | "title"
  | "categoryId"
  | "startAt"
  | "endAt"
  | "detailUrl"
  | "organizerName"
  | "subtitle"
  | "location"
  | "description"
  | "asset";

export type SubmissionFieldErrors = Partial<
  Record<SubmissionFieldName, string>
>;

export interface SubmissionFormValues extends SubmissionDraft {
  /** 업로드가 끝난 포스터. 업로드 중이거나 실패면 null이다. */
  assetId: string | null;
}

export interface ValidateOptions {
  /**
   * 기간 판정의 기준이 되는 서버 시각. 클라이언트 시계를 직접 읽지 않는다.
   * 아직 모르면 null이며, 그때는 지금과 비교하는 판정을 서버에 맡긴다.
   */
  now: Date | null;
  /** 서버 운영 제한값. 아직 모르면 null */
  config: SignageConfig | null;
  /** 고를 수 있는 카테고리. 아직 모르면 null */
  categories: readonly Category[] | null;
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
  { now, config, categories }: ValidateOptions,
): SubmissionFieldErrors {
  const errors: SubmissionFieldErrors = {};

  const title = values.title.trim();
  if (title.length === 0) {
    errors.title = "제목을 입력해 주세요.";
  } else if (config && title.length > config.titleMaxLength) {
    errors.title = `제목은 ${config.titleMaxLength}자까지 쓸 수 있어요. 지금 ${title.length}자입니다.`;
  }

  if (values.categoryId.length === 0) {
    errors.categoryId = "카테고리를 선택해 주세요.";
  } else if (
    categories &&
    !categories.some((category) => category.id === values.categoryId)
  ) {
    errors.categoryId = "선택할 수 없는 카테고리예요.";
  }

  const startAt = parseSeoul(values.startAt);
  const endAt = parseSeoul(values.endAt);
  if (startAt === null) {
    errors.startAt = "게시 시작 시각을 입력해 주세요.";
  }
  if (endAt === null) {
    errors.endAt = "게시 종료 시각을 입력해 주세요.";
  }
  if (startAt !== null && endAt !== null) {
    if (now !== null && config !== null) {
      Object.assign(errors, checkSchedule(startAt, endAt, now, config));
    } else if (endAt.getTime() <= startAt.getTime()) {
      errors.endAt = "종료 시각은 시작 시각보다 뒤여야 해요.";
    }
  }

  const detailUrl = values.detailUrl.trim();
  if (
    detailUrl.length > 0 &&
    config &&
    !isAllowedDetailUrl(detailUrl, config)
  ) {
    errors.detailUrl = `${config.allowedDetailUrlHosts.join(", ")}의 https 주소만 쓸 수 있어요.`;
  }

  for (const field of Object.keys(
    TEXT_LIMITS,
  ) as (keyof typeof TEXT_LIMITS)[]) {
    const length = values[field].trim().length;
    if (length > TEXT_LIMITS[field]) {
      errors[field] =
        `${TEXT_LIMITS[field]}자까지 쓸 수 있어요. 지금 ${length}자입니다.`;
    }
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

/** 서버 422의 `fields` 키 → 폼 항목. 서버는 API 필드 이름으로 준다. */
const SERVER_FIELD_TO_FORM: Record<string, SubmissionFieldName> = {
  title: "title",
  categoryId: "categoryId",
  startAt: "startAt",
  endAt: "endAt",
  detailUrl: "detailUrl",
  organizerName: "organizerName",
  subtitle: "subtitle",
  location: "location",
  description: "description",
  assetId: "asset",
};

/**
 * 서버 필드 오류를 입력 칸에 붙일 수 있는 형태로 바꾼다. 폼에 없는 항목의 오류는
 * 버리지 않고 `other`로 모아 요약에 보여준다.
 */
export function toFormFieldErrors(fields: Record<string, string>): {
  fieldErrors: SubmissionFieldErrors;
  other: string[];
} {
  const fieldErrors: SubmissionFieldErrors = {};
  const other: string[] = [];
  for (const [key, message] of Object.entries(fields)) {
    const field = SERVER_FIELD_TO_FORM[key];
    if (field) fieldErrors[field] = message;
    else other.push(message);
  }
  return { fieldErrors, other };
}
