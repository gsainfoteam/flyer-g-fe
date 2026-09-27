/**
 * QR과 상세 링크는 허용된 Ziggle 도메인의 HTTPS 주소만 받는다.
 * 명세 FR-SUB-02, FR-INT-01, 9.4 (피싱 링크 방지)
 *
 * 서버는 host 수준으로 검증하고, `https://ziggle.gistory.me/notice/{id}` 형식이면
 * 공지 ID를 뽑아 "공지 하나에 신청 하나"의 기준으로 쓴다. (`API-CHANGES-BACKEND.md` 3절)
 */
export const ZIGGLE_ORIGIN = "https://ziggle.gistory.me";
/** 화면에 주소로 적을 때 쓴다. 예: TV의 "ziggle.gistory.me" */
export const ZIGGLE_HOST = new URL(ZIGGLE_ORIGIN).host;

export const ALLOWED_ZIGGLE_HOSTS: readonly string[] = ["ziggle.gistory.me"];

export function isAllowedZiggleUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  return (
    url.protocol === "https:" && ALLOWED_ZIGGLE_HOSTS.includes(url.hostname)
  );
}

const ZIGGLE_NOTICE_PATH = /^\/notice\/([A-Za-z0-9_-]{1,64})\/?$/;

/** 상세 링크가 Ziggle 공지 주소면 공지 ID, 아니면 null. 서버와 같은 규칙이다. */
export function ziggleNoticeIdOf(value: string): string | null {
  if (!isAllowedZiggleUrl(value)) return null;
  const url = new URL(value);
  return ZIGGLE_NOTICE_PATH.exec(url.pathname)?.[1] ?? null;
}
