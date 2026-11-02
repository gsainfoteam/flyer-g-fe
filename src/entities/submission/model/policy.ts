import { addSeoulMonths } from "@/shared/lib/datetime";
import type { SubmissionKind } from "./kind";

/**
 * 게시 운영 제한값 (`GET /signage/config`, `API-REQUIREMENTS.md` 10.3).
 *
 * 서버가 같은 값으로 검증하므로, 폼이 이 값을 받아 미리 막으면 "된다고 했는데
 * 거절당하는" 일이 없다. 값을 프론트에 상수로 두지 않는다.
 */
export interface SignageConfig {
  maxUploadBytes: number;
  /** 제목 최대 글자 수(앞뒤 공백 제외) */
  titleMaxLength: number;
  /** 최대 게시 기간(개월, 서울 달력 기준) */
  maxPublishMonths: number;
  /**
   * 게시 시작 전 최소 신청 시간(시간). 0이면 제한 없음.
   * 서버는 규칙을 없앴고(배포 ②) 항상 0을 주다가 정리 배포에서 필드를 지운다.
   */
  minLeadTimeHours: number;
  /** 지금 업로드를 받는 MIME. 영상(`video/*`)은 영상 업로드를 연 환경에서만 있다. */
  allowedMimeTypes: string[];
  /** 상세 링크(QR)로 허용하는 호스트. HTTPS만 허용한다 */
  allowedDetailUrlHosts: string[];
  /** 영상 포스터 최대 용량(바이트)과 길이(초). 배포 ① */
  maxVideoUploadBytes: number;
  maxVideoDurationSeconds: number;
  /** 이벤트 배너 최대 게시 일수(서울 자정 기준 1일 이상). 배포 ③ */
  eventBannerMaxDays: number;
  /** 소식 제보 게시 일수. 승인한 순간부터 센다. 배포 ④ */
  storyDisplayDays: number;
  /**
   * 사용자당 서울 하루 신청 한도. 한도가 있는 종류만 들어 있다. 그날 만든 그 종류의
   * 신청을 취소·반려까지 모두 센다. 넘으면 429 `DAILY_LIMIT_EXCEEDED`.
   */
  dailySubmissionLimits: Partial<Record<SubmissionKind, number>>;
}

/** 게시 카테고리 (`GET /signage/categories`) */
export interface Category {
  id: string;
  name: string;
}

export interface ScheduleErrors {
  startAt?: string;
  endAt?: string;
}

const HOUR_MS = 60 * 60 * 1000;

/**
 * 게시 기간 규칙. 서버(`flyer-g-be` `validateSchedule`)와 같은 규칙이다.
 * 기준 시각은 항상 서버 시각이다.
 *
 * - 시작은 신청 시각에서 `minLeadTimeHours` 이후
 * - 종료는 시작보다 뒤, 지금보다 뒤
 * - 기간은 시작에서 `maxPublishMonths`개월(서울 달력, 말일 보정) 이하
 */
export function checkSchedule(
  startAt: Date,
  endAt: Date,
  now: Date,
  config: Pick<SignageConfig, "minLeadTimeHours" | "maxPublishMonths">,
): ScheduleErrors {
  const errors: ScheduleErrors = {};
  const earliestStart = now.getTime() + config.minLeadTimeHours * HOUR_MS;
  if (startAt.getTime() < earliestStart) {
    errors.startAt = `게시 시작은 신청 시각으로부터 ${config.minLeadTimeHours}시간 이후여야 해요.`;
  }

  if (endAt.getTime() <= startAt.getTime()) {
    errors.endAt = "종료 시각은 시작 시각보다 뒤여야 해요.";
  } else if (endAt.getTime() <= now.getTime()) {
    errors.endAt = "종료 시각은 현재보다 뒤여야 해요.";
  } else if (
    endAt.getTime() > addSeoulMonths(startAt, config.maxPublishMonths).getTime()
  ) {
    errors.endAt = `게시 기간은 최대 ${config.maxPublishMonths}개월이에요.`;
  }
  return errors;
}

/** 이 URL을 상세 링크로 쓸 수 있는가. 허용된 호스트의 HTTPS만 받는다. */
export function isAllowedDetailUrl(
  value: string,
  config: Pick<SignageConfig, "allowedDetailUrlHosts">,
): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  return (
    url.protocol === "https:" &&
    !url.username &&
    !url.password &&
    !url.port &&
    config.allowedDetailUrlHosts.includes(url.hostname)
  );
}
