import type { SessionUser } from "../model/types";

/**
 * 인증 경계.
 *
 * 실제 구현은 인포팀 계정(account.gistory.me) OAuth 2.0 + PKCE로 code를 받아 백엔드가
 * 토큰으로 바꿔 주는 방식이다 (`API-CHANGES-BACKEND.md` 2절, `http-auth-adapter.ts`).
 *
 * 토큰은 이 계층 밖으로 나가지 않는다. 화면은 `SessionUser`만 본다.
 */
export interface CompletedSignIn {
  user: SessionUser;
  /** 로그인을 시작할 때 넘긴 앱 내부 경로 */
  returnTo: string;
}

export interface AuthAdapter {
  /**
   * 앱 시작 시 기존 세션을 복원한다. 세션이 없으면 null.
   * 실패하면 던진다 — 호출부가 `error` 상태로 옮긴다.
   */
  restore(signal?: AbortSignal): Promise<SessionUser | null>;

  /**
   * 로그인을 시작한다.
   *
   * 실제 구현에서는 인증 제공자로 브라우저를 넘기므로 이 Promise가 끝나지 않는다.
   * 돌아오면 `/auth/callback`에서 `completeSignIn()`이 code를 토큰으로 바꾼다.
   * 개발용 mock은 즉시 사용자를 돌려준다.
   *
   * `returnTo`는 로그인 후 돌아갈 앱 내부 경로다. 외부 주소를 넘기지 않는다.
   */
  signIn(returnTo: string): Promise<SessionUser | null>;

  /**
   * 로그인 제공자에서 돌아온 뒤(`/auth/callback`) 로그인을 마친다. 주소의 query를
   * 그대로 넘긴다. 제공자가 거절했거나 이 창에서 시작한 로그인이 아니면 던진다.
   */
  completeSignIn(
    params: URLSearchParams,
    signal?: AbortSignal,
  ): Promise<CompletedSignIn>;

  signOut(): Promise<void>;
}
