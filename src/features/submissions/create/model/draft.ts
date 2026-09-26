import type { ZiggleNotice } from "@/entities/notice";
import { isKnownCategory } from "@/entities/submission";
import type {
  SignageSubmissionExpanded,
  SubmissionStatus,
} from "@/entities/submission";
import { toSeoulDateTimeInputValue } from "@/shared/lib/datetime";

/**
 * 게시 신청 폼의 입력값 (명세 FR-SUB-02).
 *
 * 시각은 `<input type="datetime-local">`이 쓰는 Asia/Seoul 벽시계 문자열
 * ("YYYY-MM-DDTHH:mm")로 들고 있다가 제출 직전에만 UTC Date로 바꾼다.
 * 중간에 Date로 오가면 표시와 저장 시각이 어긋난다.
 */
export interface SubmissionDraft {
  title: string;
  categoryId: string;
  startAt: string;
  endAt: string;
  detailUrl: string;
}

/** 제출 전이라 게시자가 고쳐서 (다시) 제출할 수 있는 상태 (명세 FR-DASH-02) */
const EDITABLE_STATUSES: readonly SubmissionStatus[] = ["DRAFT", "REJECTED"];

export function isEditableStatus(status: SubmissionStatus): boolean {
  return EDITABLE_STATUSES.includes(status);
}

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/**
 * 기본 게시 기간.
 *
 * 최대 게시 기간과 최소 사전 신청 시간이 아직 정해지지 않아(명세 15장 4번)
 * 검토 시간을 감안한 무난한 값을 넣어 둔다. 정책이 정해지면 여기와 검증을 함께 바꾼다.
 */
export const DEFAULT_START_OFFSET_DAYS = 1;
export const DEFAULT_PERIOD_DAYS = 7;

function seoulHour(base: Date, offsetDays: number, hour: number): Date {
  const shifted = new Date(base.getTime() + offsetDays * DAY_MS);
  // Asia/Seoul 기준 날짜의 지정 시각으로 맞춘다.
  const seoulMidnightUtc = Date.UTC(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth(),
    shifted.getUTCDate(),
  );
  return new Date(seoulMidnightUtc + (hour - 9) * HOUR_MS);
}

export function createEmptyDraft(now: Date): SubmissionDraft {
  const seoulNow = new Date(now.getTime() + 9 * HOUR_MS);
  const start = seoulHour(seoulNow, DEFAULT_START_OFFSET_DAYS, 9);
  const end = seoulHour(seoulNow, DEFAULT_START_OFFSET_DAYS + DEFAULT_PERIOD_DAYS, 18);

  return {
    title: "",
    categoryId: "",
    startAt: toSeoulDateTimeInputValue(start),
    endAt: toSeoulDateTimeInputValue(end),
    detailUrl: "",
  };
}

/**
 * 공지에서 채울 수 있는 값을 채운다 (명세 FR-INT-01).
 *
 * 제목과 카테고리는 사용자가 고칠 수 있다. 상세 URL은 공지가 정하는 값이라
 * 화면에서 읽기 전용으로 보여준다.
 */
export function draftFromNotice(
  notice: ZiggleNotice,
  now: Date,
): SubmissionDraft {
  return {
    ...createEmptyDraft(now),
    title: notice.title,
    categoryId: isKnownCategory(notice.categoryId) ? notice.categoryId : "",
    detailUrl: notice.detailUrl,
  };
}

/**
 * 기존 신청을 수정·재신청할 때의 초기값 (명세 FR-DASH-02).
 * 카탈로그에 없는 카테고리는 비워서 사용자가 다시 고르게 한다.
 */
export function draftFromSubmission(
  submission: SignageSubmissionExpanded,
): SubmissionDraft {
  return {
    title: submission.title,
    categoryId: isKnownCategory(submission.categoryId)
      ? submission.categoryId
      : "",
    startAt: toSeoulDateTimeInputValue(submission.startAt),
    endAt: toSeoulDateTimeInputValue(submission.endAt),
    detailUrl: submission.detailUrl,
  };
}
