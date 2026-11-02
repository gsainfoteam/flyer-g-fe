import { useEffect, useState } from "react";

/**
 * TV(게임 호스트) 시계 맞추기. 게임의 단계·턴 끝 시각은 TV 시계로 정해지므로 폰이 자기
 * 시계로 세면 두 기기의 시계 차이만큼 틀린다(TV가 12초 빠르면 "22초 뒤 시작").
 * TV는 상태를 보낼 때 자기 시각(`now`)을 함께 싣고, 폰은 그 차이를 재서 TV 시계로 센다.
 */

/** TV 시계가 이만큼 넘게 뒤로 가면 TV가 시계를 고친 것으로 보고 새로 잰다. */
const CLOCK_RESET_MS = 3_000;

/**
 * TV 시계 - 폰 시계(ms)의 다음 값. 받은 시각 차이는 전송 지연만큼 작게 나온다. 그래서
 * 가장 큰 값을 참값에 가깝다고 보고 지킨다. 다만 TV가 시계를 크게 고치면(뒤로 3초 넘게)
 * 그 값으로 다시 시작한다.
 */
export function nextClockOffset(current: number | null, sample: number): number {
  if (current === null || sample > current || current - sample > CLOCK_RESET_MS) {
    return sample;
  }
  return current;
}

/** 상태 메시지의 TV 시각. 없거나 틀리면(옛 TV) null */
export function hostTimeOf(message: { now?: unknown }): number | null {
  return typeof message.now === "number" && Number.isFinite(message.now) ? message.now : null;
}

/**
 * TV 시계로 본 지금(ms). 남은 초를 그리려고 1초보다 촘촘히 다시 그린다.
 * `offsetMs`는 `nextClockOffset`으로 잰 차이다.
 */
export function useHostNow(offsetMs: number, intervalMs = 250): number {
  const [deviceNow, setDeviceNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setDeviceNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return deviceNow + offsetMs;
}
