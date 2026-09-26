/**
 * QR과 상세 링크는 허용된 Ziggle 도메인의 HTTPS 주소만 받는다.
 * 명세 FR-SUB-02, FR-INT-01, 9.4 (피싱 링크 방지)
 *
 * 공식 상세 URL 형식은 아직 미결정(명세 15장 15번)이므로 host 수준만 검증한다.
 */
export const ZIGGLE_ORIGIN = "https://ziggle.gistory.me";

export const ALLOWED_ZIGGLE_HOSTS: readonly string[] = ["ziggle.gistory.me"];

export function isAllowedZiggleUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  return url.protocol === "https:" && ALLOWED_ZIGGLE_HOSTS.includes(url.hostname);
}
