import type { SignageSubmissionExpanded } from "@/entities/submission";
import { toSeoulDateTimeInputValue } from "@/shared/lib/datetime";

/**
 * 게시 신청 폼의 입력값 (명세 FR-SUB-02).
 *
 * 시각은 `<input type="datetime-local">`이 쓰는 Asia/Seoul 벽시계 문자열
 * ("YYYY-MM-DDTHH:mm")로 들고 있다가 제출 직전에만 UTC Date로 바꾼다.
 * 중간에 Date로 오가면 표시와 저장 시각이 어긋난다.
 *
 * Ziggle 공지를 조회할 API가 없어(`API-CHANGES-BACKEND.md` 3절) 주최·부제·장소·
 * 설명·상세 링크를 신청자가 직접 입력한다. 선택 입력은 빈 문자열로 들고 있다가
 * 보낼 때 null로 바꾼다.
 */
export interface SubmissionDraft {
  title: string;
  categoryId: string;
  startAt: string;
  endAt: string;
  /** 상세 링크(QR). 선택 */
  detailUrl: string;
  organizerName: string;
  subtitle: string;
  location: string;
  description: string;
}

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/**
 * 기본 게시 기간: 모레 09:00 ~ 그로부터 일주일 뒤 18:00 (KST).
 *
 * 서버는 시작이 신청 시각에서 24시간 이후여야 받는다(`minLeadTimeHours`). 모레
 * 09:00은 지금이 몇 시든 24시간 이후라, 폼을 열자마자 오류가 뜨지 않는다.
 */
export const DEFAULT_START_OFFSET_DAYS = 2;
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
  const end = seoulHour(
    seoulNow,
    DEFAULT_START_OFFSET_DAYS + DEFAULT_PERIOD_DAYS,
    18,
  );

  return {
    title: "",
    categoryId: "",
    startAt: toSeoulDateTimeInputValue(start),
    endAt: toSeoulDateTimeInputValue(end),
    detailUrl: "",
    organizerName: "",
    subtitle: "",
    location: "",
    description: "",
  };
}

/** 기존 신청을 고칠 때의 초기값 (명세 FR-DASH-02). */
export function draftFromSubmission(
  submission: SignageSubmissionExpanded,
): SubmissionDraft {
  return {
    title: submission.title,
    categoryId: submission.categoryId,
    startAt: toSeoulDateTimeInputValue(submission.startAt),
    endAt: toSeoulDateTimeInputValue(submission.endAt),
    detailUrl: submission.detailUrl ?? "",
    organizerName: submission.organizerName ?? "",
    subtitle: submission.subtitle ?? "",
    location: submission.location ?? "",
    description: submission.description ?? "",
  };
}

/** 고치는 신청의 원래 게시 기간. 폼 입력과 같은 형식이다. */
export interface OriginalSchedule {
  startAt: string;
  endAt: string;
}

/**
 * 게시 기간을 바꿨는가. 폼 입력(분 단위) 그대로 비교한다. 저장된 시각을 다시 변환해
 * 비교하면 초 단위 차이로 바꾸지 않은 기간을 바꾼 것으로 본다.
 */
export function isScheduleChanged(
  draft: Pick<SubmissionDraft, "startAt" | "endAt">,
  original: OriginalSchedule,
): boolean {
  return draft.startAt !== original.startAt || draft.endAt !== original.endAt;
}

/** 선택 입력을 보낼 값으로. 비었으면 null(서버에서 비운다). */
export function optionalText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
