import { Image, MessageSquareText, PartyPopper } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { SubmissionKind } from "../model/kind";

/**
 * 종류별 아이콘과 색 클래스. 클래스 이름을 문자열 그대로 두어야 Tailwind가 찾는다.
 */
interface KindStyle {
  icon: LucideIcon;
  /** 옅은 바탕만 (카드 머리 띠) */
  tint: string;
  /** 옅은 바탕 + 진한 글자 (아이콘 사각형, 칩) */
  soft: string;
  /** 진한 바탕 + 흰 글자 (동그란 행동 버튼) */
  solid: string;
  /** 구성 막대의 칸 */
  bar: string;
  /** 어두운 카드 위의 숫자·범례 */
  bright: string;
}

export const KIND_STYLE: Record<SubmissionKind, KindStyle> = {
  POSTER: {
    icon: Image,
    tint: "bg-type-poster-subtle",
    soft: "bg-type-poster-subtle text-type-poster",
    solid: "bg-type-poster text-ink-inverse",
    bar: "bg-type-poster-bar",
    bright: "text-type-poster-bright",
  },
  EVENT_BANNER: {
    icon: PartyPopper,
    tint: "bg-type-event-subtle",
    soft: "bg-type-event-subtle text-type-event",
    solid: "bg-type-event text-ink-inverse",
    bar: "bg-type-event-bar",
    bright: "text-type-event-bright",
  },
  STORY: {
    icon: MessageSquareText,
    tint: "bg-type-story-subtle",
    soft: "bg-type-story-subtle text-type-story",
    solid: "bg-type-story text-ink-inverse",
    bar: "bg-type-story-bar",
    bright: "text-type-story-bright",
  },
};
