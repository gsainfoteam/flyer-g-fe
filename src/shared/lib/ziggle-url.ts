/**
 * QR과 상세 링크는 허용된 Ziggle 도메인의 HTTPS 주소만 받는다.
 * 명세 FR-SUB-02, FR-INT-01, 9.4 (피싱 링크 방지)
 *
 * 공식 상세 URL 형식은 아직 미결정(명세 15장 15번)이므로 host 수준만 검증한다.
 */
export const ZIGGLE_ORIGIN = "https://ziggle.gistory.me";

export const ALLOWED_ZIGGLE_HOSTS: readonly string[] = ["ziggle.gistory.me"];

/** 초기 프로토타입 목 데이터가 쓰던 구 주소. 신규 입력값으로는 허용하지 않는다. */
const LEGACY_ZIGGLE_HOSTS: readonly string[] = ["ziggle.gist.ac.kr"];

export function isAllowedZiggleUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  return url.protocol === "https:" && ALLOWED_ZIGGLE_HOSTS.includes(url.hostname);
}

/**
 * 구 목 데이터의 host를 공식 host로 바꾼다.
 * 목 fixture 전환 전용이며 사용자 입력에는 쓰지 않는다.
 */
export function normalizeLegacyZiggleUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return value;
  }
  if (!LEGACY_ZIGGLE_HOSTS.includes(url.hostname)) return value;
  url.hostname = new URL(ZIGGLE_ORIGIN).hostname;
  url.protocol = "https:";
  return url.toString();
}
