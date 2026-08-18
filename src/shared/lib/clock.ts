/**
 * 시각 공급 경계. 상태·기간 계산은 항상 주입된 clock을 쓴다.
 * 테스트가 실제 시간에 의존하지 않게 하고(공통 품질 기준),
 * 실제 연동에서는 서버가 준 시각으로 교체할 수 있게 한다. 명세 6.3
 */
export interface Clock {
  now(): Date;
}

export const systemClock: Clock = {
  now: () => new Date(),
};

export function createFixedClock(at: Date): Clock {
  return { now: () => new Date(at.getTime()) };
}
