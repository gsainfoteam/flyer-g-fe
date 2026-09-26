import { useEffect, useState } from "react";

/**
 * 서버가 알려 준 시각을 기준으로 흐르는 현재 시각.
 *
 * 응답에 실린 `serverTime`은 받은 순간에 멈춰 있다. 화면을 오래 열어 두면 "지금"이
 * 그만큼 과거가 된다. 받은 시각과의 차이만큼 기기 시계로 흘려 보내고, 새 응답이
 * 오면 다시 맞춘다. 기기 시계의 절대값이 틀려도 흐르는 속도는 믿을 만하다.
 *
 * 서버 시각을 아직 모르면 null이다. 클라이언트 시계로 대신하지 않는다.
 */
const TICK_MS = 30_000;

export function useServerNow(
  serverTime: Date | undefined,
  /** 응답을 받은 기기 시각(ms). TanStack Query의 `dataUpdatedAt` */
  receivedAt: number,
): Date | null {
  const [now, setNow] = useState<Date | null>(null);
  const baseMs = serverTime?.getTime();

  useEffect(() => {
    if (baseMs === undefined) return;
    const update = () => setNow(new Date(baseMs + (Date.now() - receivedAt)));
    update();
    const id = window.setInterval(update, TICK_MS);
    return () => window.clearInterval(id);
  }, [baseMs, receivedAt]);

  return baseMs === undefined ? null : now;
}
