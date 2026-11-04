import { getSeoulParts } from "@/shared/lib/datetime";
import type { SignageConfig } from "./policy";
import type { EventBannerMode, EventBannerOccasion } from "./types";
import { STORY_TAGS } from "./types";

/**
 * 이벤트 배너·소식 제보 입력 규칙. 서버(`flyer-g-be` `kinds/event-banner.kind.ts`,
 * `kinds/story.kind.ts`, 입력 DTO)와 같은 규칙이다. 폼이 미리 막고 mock이 서버처럼
 * 거절한다. 오류 키는 서버의 필드 경로(`eventBanner.message`)와 같다.
 */
export const EVENT_BANNER_TEXT_LIMITS = {
  recipient: 20,
  message: 60,
  sender: 20,
} as const;

export const STORY_BODY_LIMITS = { min: 10, max: 140 } as const;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface EventBannerValues {
  mode: EventBannerMode;
  occasion: EventBannerOccasion | null;
  recipient: string;
  message: string | null;
  sender: string | null;
  photoAssetId: string | null;
  photoConsent: boolean;
  assetId: string | null;
}

export function isSeoulMidnight(date: Date): boolean {
  const parts = getSeoulParts(date);
  return parts.hour24 === 0 && parts.minute === 0 && date.getUTCSeconds() === 0;
}

/** 이벤트 배너 내용과 기간. 기간은 서울 자정부터 자정까지 1~`eventBannerMaxDays`일. */
export function checkEventBanner(
  banner: EventBannerValues,
  period: { startAt: Date; endAt: Date },
  now: Date,
  config: Pick<SignageConfig, "eventBannerMaxDays">,
): Record<string, string> {
  const errors: Record<string, string> = {};
  const recipient = banner.recipient.trim();
  if (!recipient) {
    errors["eventBanner.recipient"] = "받는 사람을 입력하세요.";
  } else if (recipient.length > EVENT_BANNER_TEXT_LIMITS.recipient) {
    errors["eventBanner.recipient"] =
      `받는 사람은 ${EVENT_BANNER_TEXT_LIMITS.recipient}자 이하여야 합니다.`;
  }
  const message = banner.message?.trim() ?? "";
  if (message.length > EVENT_BANNER_TEXT_LIMITS.message) {
    errors["eventBanner.message"] =
      `전할 말은 ${EVENT_BANNER_TEXT_LIMITS.message}자 이하여야 합니다.`;
  }
  if ((banner.sender?.trim() ?? "").length > EVENT_BANNER_TEXT_LIMITS.sender) {
    errors["eventBanner.sender"] =
      `보내는 사람은 ${EVENT_BANNER_TEXT_LIMITS.sender}자 이하여야 합니다.`;
  }

  if (banner.mode === "TEMPLATE") {
    if (!banner.occasion) {
      errors["eventBanner.occasion"] = "어떤 소식인지 고르세요.";
    }
    if (!message) errors["eventBanner.message"] ??= "전할 말을 입력하세요.";
    if (banner.photoAssetId && !banner.photoConsent) {
      errors["eventBanner.photoConsent"] =
        "사진 속 사람의 동의를 받았는지 확인해 주세요.";
    }
  } else if (!banner.assetId) {
    errors["eventBanner.assetId"] = "배너 이미지를 올려주세요.";
  }

  const { startAt, endAt } = period;
  if (!isSeoulMidnight(startAt)) {
    errors.startAt = "시작은 서울 기준 자정(00:00)이어야 합니다.";
  }
  if (endAt <= startAt) {
    errors.endAt = "종료 시각은 시작 시각보다 뒤여야 합니다.";
  } else if (endAt <= now) {
    errors.endAt = "종료 시각이 이미 지났습니다.";
  } else if (!isSeoulMidnight(endAt)) {
    errors.endAt = "종료는 서울 기준 자정(00:00)이어야 합니다.";
  } else if (
    endAt.getTime() - startAt.getTime() >
    config.eventBannerMaxDays * DAY_MS
  ) {
    errors.endAt = `이벤트 배너는 최대 ${config.eventBannerMaxDays}일까지 걸 수 있습니다.`;
  }
  return errors;
}

export function checkStory(story: {
  tag: string;
  body: string;
}): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!(STORY_TAGS as readonly string[]).includes(story.tag)) {
    errors["story.tag"] = "말머리를 고르세요.";
  }
  const length = story.body.trim().length;
  if (length < STORY_BODY_LIMITS.min) {
    errors["story.body"] =
      `본문은 ${STORY_BODY_LIMITS.min}자 이상이어야 합니다.`;
  } else if (length > STORY_BODY_LIMITS.max) {
    errors["story.body"] = `본문은 ${STORY_BODY_LIMITS.max}자 이하여야 합니다.`;
  }
  return errors;
}

/** 서버가 만드는 목록 제목. 이벤트는 "생일 · 지민에게", 제보는 본문 앞 40자. */
const OCCASION_TITLE: Record<EventBannerOccasion, string> = {
  BIRTHDAY: "생일",
  ADMISSION: "합격",
  AWARD: "수상",
  WELCOME: "환영",
  OTHER: "소식",
};

export function eventBannerTitle(
  occasion: EventBannerOccasion | null,
  recipient: string,
): string {
  return `${occasion ? OCCASION_TITLE[occasion] : "이벤트 배너"} · ${recipient.trim()}에게`;
}

export function storyTitle(body: string): string {
  return body.trim().replace(/\s+/g, " ").slice(0, 40);
}
