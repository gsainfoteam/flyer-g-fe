import { useMemo, useRef } from "react";

/**
 * 제출 시도 하나를 가리키는 key (명세 FR-SUB-04).
 *
 * 더블 클릭이나 네트워크 재시도로 신청이 두 건 만들어지지 않게 한다. 같은 시도의
 * 재시도에는 반드시 같은 key를 다시 쓴다. 값이 바뀌면 그때가 새 시도다.
 *
 * `Idempotency-Key` 헤더로 보낸다(`http-client.ts`). 서버는 UUID 형식만 받는다.
 */
export function createIdempotencyKey(): string {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // randomUUID가 없는 환경에서도 서버가 받는 UUID v4 형식을 유지한다.
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * 한 시도 동안 유지되는 key. 응답을 못 받아 다시 보낸 요청은 같은 key를 써야
 * 서버가 두 번 처리하지 않는다. 사용자가 새로 시작할 때(다이얼로그를 다시 열 때)
 * `renew()`로 바꾼다. 요청 함수 안에서 매번 새로 만들면 재시도가 새 요청이 된다.
 *
 * 응답을 받지 못한 요청(연결 끊김·시간 초과)이 있었는지도 기억한다. 서버에 닿아
 * 처리 중인지 모르는 상태라, 같은 key로 다시 보냈을 때 409가 오면 "다른 사람이 먼저
 * 처리함"이 아니라 "내 요청이 아직 처리 중"일 수 있다. (`recover-conflict.ts`)
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
