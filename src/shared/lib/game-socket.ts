import { getAppEnv, isMockUnit } from "@/shared/config/env";
import type { AppEnv } from "@/shared/config/env";

/**
 * 게임 중계 서버 주소(`wss://<api>/games/ws`). TV 편성과 같은 백엔드에 있어 편성
 * 단위(`display`)가 실제 API일 때만 쓴다. mock이면 null이고, 게임은 같은 브라우저
 * 탭끼리 잇는다(개발용).
 */
export function gameSocketBase(env: AppEnv = getAppEnv()): string | null {
  if (isMockUnit(env, "display") || !env.apiBaseUrl) return null;
  const url = new URL("/games/ws", env.apiBaseUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.toString();
}
