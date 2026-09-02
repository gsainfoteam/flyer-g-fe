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
