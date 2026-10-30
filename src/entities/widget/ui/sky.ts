import { Cloud, CloudRain, CloudSun, Snowflake, Sun } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Sky } from "@/entities/widget/model/data-content";

/**
 * 하늘 상태 아이콘. 이모지는 쓰지 않는다. 사이니지 OS(Tizen·라즈베리파이)에 컬러 이모지
 * 글꼴이 없으면 빈 네모로 나온다. SVG 아이콘은 어디서나 같게 그려진다.
 */
export const SKY_LABEL: Record<Sky, { text: string; icon: LucideIcon; tone: string }> = {
  CLEAR: { text: "맑음", icon: Sun, tone: "text-warning" },
  PARTLY_CLOUDY: { text: "구름 조금", icon: CloudSun, tone: "text-warning" },
  CLOUDY: { text: "흐림", icon: Cloud, tone: "text-ink-muted" },
  RAIN: { text: "비", icon: CloudRain, tone: "text-info" },
  SNOW: { text: "눈", icon: Snowflake, tone: "text-info" },
};
