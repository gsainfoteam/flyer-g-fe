/**
 * 재연결 지수 backoff (명세 FR-PLY-07).
 *
 * 실패가 이어질수록 간격을 늘려 서버 복구 직후의 요청 폭주를 막는다. jitter는
 * 같은 시각에 꺼졌다 켜진 기기 수십 대가 동시에 두드리는 것을 흩뜨린다.
 * 성공하면 호출부가 failureCount 0으로 되돌려 정상 주기로 복귀한다.
 */
export interface BackoffOptions {
  /** 최대 간격. 이보다 길면 복구가 너무 늦게 반영된다. */
  maxMs?: number;
  /** 0~1. 간격에 곱해지는 무작위 흔들림 폭. */
  jitterRatio?: number;
  /** 테스트 주입용 난수원 (0 <= r < 1) */
  random?: () => number;
}

export function computeBackoffMs(
  baseMs: number,
  failureCount: number,
  options: BackoffOptions = {},
): number {
  const maxMs = options.maxMs ?? 5 * 60 * 1000;
  const jitterRatio = options.jitterRatio ?? 0.2;
  const random = options.random ?? Math.random;

  if (failureCount <= 0) return baseMs;

  const exponential = Math.min(maxMs, baseMs * 2 ** (failureCount - 1));
  // jitter는 간격을 줄이는 쪽으로만 적용한다. max를 넘는 급증을 만들지 않는다.
  const jitter = exponential * jitterRatio * random();
  return Math.round(exponential - jitter);
}
