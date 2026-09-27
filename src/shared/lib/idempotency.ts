import { useMemo, useRef } from "react";

/**
 * 제출 시도 하나를 가리키는 key (명세 FR-SUB-04).
 *
 * 더블 클릭이나 네트워크 재시도로 신청이 두 건 만들어지지 않게 한다. 같은 시도의
 * 재시도에는 반드시 같은 key를 다시 쓴다. 값이 바뀌면 그때가 새 시도다.
 *
 * 서버가 이 값을 어떤 헤더로 받을지는 미확정이다. (`API-REQUIREMENTS.md` 1.3)
 */
export function createIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // 구형 환경 대비. 충돌 가능성이 있으므로 서버 중복 판정을 대신하지 않는다.
  return `idem-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

/**
 * 한 시도 동안 유지되는 key. 응답을 못 받아 다시 보낸 요청은 같은 key를 써야
 * 서버가 두 번 처리하지 않는다. 사용자가 새로 시작할 때(다이얼로그를 다시 열 때)
 * `renew()`로 바꾼다. 요청 함수 안에서 매번 새로 만들면 재시도가 새 요청이 된다.
 *
 * 응답을 받지 못한 요청(연결 끊김·시간 초과)이 있었는지도 기억한다. 서버에 닿아
 * 처리됐는지 모르는 상태라, 같은 key로 다시 보냈을 때 409가 오면 "다른 사람이 먼저
 * 처리함"이 아니라 "내 요청이 이미 처리됨"일 수 있다. (`API-FOLLOWUP-2026-09.md` 2-1)
 */
export function useIdempotencyKey() {
  const keyRef = useRef<string | null>(null);
  const unknownOutcomeRef = useRef(false);
  return useMemo(
    () => ({
      current: () => (keyRef.current ??= createIdempotencyKey()),
      renew: () => {
        keyRef.current = null;
        unknownOutcomeRef.current = false;
      },
      /** 이 key로 보낸 요청의 결과를 모른다(응답을 받지 못했다). */
      markOutcomeUnknown: () => {
        unknownOutcomeRef.current = true;
      },
      /** 이 key로 보낸 요청 중 결과를 모르는 것이 있었는가 */
      hadUnknownOutcome: () => unknownOutcomeRef.current,
    }),
    [],
  );
}

export type AttemptKey = ReturnType<typeof useIdempotencyKey>;
