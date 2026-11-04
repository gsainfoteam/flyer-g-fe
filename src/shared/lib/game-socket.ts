import { getAppEnv, isMockUnit } from "@/shared/config/env";
import type { AppEnv } from "@/shared/config/env";

/**
 * 게임 중계 서버 주소(`wss://<api>/games/ws`). TV 편성과 같은 백엔드에 있어 편성
 * 단위(`display`)가 실제 API일 때만 쓴다. mock이면 null이고, 게임은 같은 브라우저
 * 탭끼리 잇는다(개발용).
 */
export function gameSocketBase(env: AppEnv = getAppEnv()): string | null {
  // 개발 전용: mock 화면에서도 실제 중계(로컬 중계 서버)로 게임을 시험할 때 쓴다.
  const override = import.meta.env.DEV ? import.meta.env.VITE_GAME_SOCKET_URL : undefined;
  if (typeof override === "string" && override.trim()) return override.trim();
  if (isMockUnit(env, "display") || !env.apiBaseUrl) return null;
  const url = new URL("/games/ws", env.apiBaseUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.toString();
}
