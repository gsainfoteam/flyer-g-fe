/**
 * 앱의 경로를 한곳에서 만든다. 화면에서 문자열을 직접 조립하지 않는다.
 *
 * `paths`는 route 정의에 쓰는 패턴, `to`는 실제 이동에 쓰는 생성기다.
 */
export const paths = {
  dashboard: "/",
  studio: "/studio",
  submissions: "/submissions",
  submissionDetail: "/submissions/:submissionId",
  reviews: "/reviews",
  reviewDetail: "/reviews/:submissionId",
  displays: "/displays",
  users: "/users",
  display: "/display/:deviceId",
  login: "/login",
  /** 로그인 제공자에서 돌아오는 곳. `VITE_AUTH_REDIRECT_URI`의 경로와 같아야 한다. */
  authCallback: "/auth/callback",
} as const;

export const to = {
  dashboard: () => "/",
  studio: () => "/studio",
  studioEdit: (submissionId: string) =>
    `/studio?submissionId=${encodeURIComponent(submissionId)}`,
  /** `scope: "all"`은 관리자의 전체 신청 목록이다. 기본은 내 신청. */
  submissions: (statusGroupKey?: string, options?: { scope?: "all" }) => {
    const params = new URLSearchParams();
    if (options?.scope === "all") params.set("scope", "all");
    if (statusGroupKey && statusGroupKey !== "all") {
      params.set("status", statusGroupKey);
    }
    const query = params.toString();
    return query ? `/submissions?${query}` : "/submissions";
  },
  submissionDetail: (submissionId: string) =>
    `/submissions/${encodeURIComponent(submissionId)}`,
  reviews: () => "/reviews",
  reviewDetail: (submissionId: string) =>
    `/reviews/${encodeURIComponent(submissionId)}`,
  displays: () => "/displays",
  users: () => "/users",
  display: (deviceId: string, options?: { preview?: boolean }) =>
    `/display/${encodeURIComponent(deviceId)}${options?.preview ? "?preview=1" : ""}`,
  login: (returnTo?: string) =>
    returnTo && returnTo !== "/"
      ? `/login?returnTo=${encodeURIComponent(returnTo)}`
      : "/login",
} as const;

export const RETURN_TO_PARAM = "returnTo";

/**
 * 로그인 후 돌아갈 경로를 안전한 값으로 좁힌다.
 *
 * 외부 주소로 넘어가면 열린 리다이렉트가 된다. 앱 내부 경로만 허용하고,
 * 프로토콜이나 `//`로 시작하는 값은 버린다. (명세 9.4)
 */
export function safeReturnTo(
  value: string | null | undefined,
  fallback = "/",
): string {
  if (!value) return fallback;
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//")) return fallback;
  // "/\evil.com" 같은 역슬래시 우회도 막는다.
  if (value.includes("\\")) return fallback;
  return value;
}
