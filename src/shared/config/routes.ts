/**
 * 앱의 경로를 한곳에서 만든다. 화면에서 문자열을 직접 조립하지 않는다.
 *
 * `paths`는 route 정의에 쓰는 패턴, `to`는 실제 이동에 쓰는 생성기다.
 */
export const paths = {
  /** 로그인 전에는 소개, 로그인하면 역할별 첫 화면 */
  home: "/",
  newPoster: "/new/poster",
  mine: "/mine",
  mineDetail: "/mine/:submissionId",
  /** 하우스 관리자·운영자의 전체 컨텐츠 목록 */
  contents: "/contents",
  review: "/review",
  reviewDetail: "/review/:submissionId",
  tv: "/tv",
  roleSettings: "/settings/roles",
  display: "/display/:deviceId",
  /** 폰 참여 화면. 로그인 없이 TV의 QR로 들어온다. */
  playQuiz: "/play/quiz",
  playClickBattle: "/play/click-battle/:roomId",
  /** TV 게임 화면. 플레이어처럼 세션 없이 연다. */
  /** `:roomId`는 기기 id다. 서버 중계로 방을 열려면 그 기기의 토큰이 있어야 한다. */
  clickBattle: "/games/click-battle/:roomId",
  playShuffleboard: "/play/shuffleboard/:roomId",
  shuffleboard: "/games/shuffleboard/:roomId",
  login: "/login",
  /** 로그인 제공자에서 돌아오는 곳. `VITE_AUTH_REDIRECT_URI`의 경로와 같아야 한다. */
  authCallback: "/auth/callback",
} as const;

/**
 * 개편 전 경로. 공유된 링크와 북마크가 깨지지 않게 새 경로로 보낸다. (Phase 09)
 */
export const legacyPaths = {
  studio: "/studio",
  submissions: "/submissions",
  submissionDetail: "/submissions/:submissionId",
  reviews: "/reviews",
  reviewDetail: "/reviews/:submissionId",
  displays: "/displays",
  users: "/users",
} as const;

/** 내 컨텐츠 화면의 보기(`?view=`). 전체는 query를 붙이지 않는다. */
export type MineView = "active" | "past";

/** 상태 탭이 있는 목록 경로. "all" 탭은 query를 붙이지 않는다. */
function withStatus(path: string, statusGroupKey?: string): string {
  return statusGroupKey && statusGroupKey !== "all"
    ? `${path}?status=${encodeURIComponent(statusGroupKey)}`
    : path;
}

export const to = {
  home: () => "/",
  newPoster: () => "/new/poster",
  /** 반려·초안을 고쳐서 다시 내는 포스터 화면 */
  editPoster: (submissionId: string) =>
    `/new/poster?submissionId=${encodeURIComponent(submissionId)}`,
  /** 내 컨텐츠의 보기. 없으면 전체 */
  mine: (view?: MineView) => (view ? `/mine?view=${view}` : "/mine"),
  contents: (statusGroupKey?: string) =>
    withStatus("/contents", statusGroupKey),
  submissionDetail: (submissionId: string) =>
    `/mine/${encodeURIComponent(submissionId)}`,
  review: () => "/review",
  reviewDetail: (submissionId: string) =>
    `/review/${encodeURIComponent(submissionId)}`,
  tv: () => "/tv",
  roleSettings: () => "/settings/roles",
  display: (deviceId: string, options?: { preview?: boolean }) =>
    `/display/${encodeURIComponent(deviceId)}${options?.preview ? "?preview=1" : ""}`,
  playQuiz: (dateKey: string) => `/play/quiz?d=${encodeURIComponent(dateKey)}`,
  playClickBattle: (roomId: string, team: "A" | "B") =>
    `/play/click-battle/${encodeURIComponent(roomId)}?team=${team}`,
  clickBattle: (roomId: string) => `/games/click-battle/${encodeURIComponent(roomId)}`,
  /** 셔플보드 폰 참가. TV의 팀별 QR이 팀을 정한다. 없으면 빈 자리에 앉는다. */
  playShuffleboard: (roomId: string, seat?: "A" | "B") =>
    `/play/shuffleboard/${encodeURIComponent(roomId)}${seat ? `?team=${seat}` : ""}`,
  shuffleboard: (roomId: string) => `/games/shuffleboard/${encodeURIComponent(roomId)}`,
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
