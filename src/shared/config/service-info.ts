import { ZIGGLE_ORIGIN } from "@/shared/lib/ziggle-url";

/**
 * 서비스 운영 정보. 푸터와 안내 화면이 같은 값을 쓴다.
 */
export const SERVICE_OPERATOR = "GSA Infoteam";

export const SERVICE_CONTACT_EMAIL = "flyer-g@gistory.me";

export const SERVICE_LINKS = {
  ziggle: ZIGGLE_ORIGIN,
  // 약관은 gsainfoteam/terms 레포에서 관리한다. 개정하면 새 버전(시행일 YYMMDD)으로 바꾼다.
  terms: "https://terms.gistory.me/flyer-g/tos/260929/",
  privacy: "https://terms.gistory.me/flyer-g/privacy/260929/",
  contact: `mailto:${SERVICE_CONTACT_EMAIL}`,
} as const;
