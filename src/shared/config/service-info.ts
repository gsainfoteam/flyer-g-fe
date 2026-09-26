import { ZIGGLE_ORIGIN } from "@/shared/lib/ziggle-url";

/**
 * 서비스 운영 정보. 푸터와 안내 화면이 같은 값을 쓴다.
 */
export const SERVICE_OPERATOR = "GSA Infoteam";

export const SERVICE_CONTACT_EMAIL = "flyer@gistory.me";

export const SERVICE_LINKS = {
  ziggle: ZIGGLE_ORIGIN,
  // TODO: 전단지 이용약관과 개인정보처리방침을 terms.gistory.me에 올리면 주소를 바꾼다.
  terms: "#",
  privacy: "#",
  contact: `mailto:${SERVICE_CONTACT_EMAIL}`,
} as const;
