import type { SessionUser } from "../model/types";

/**
 * 인증 경계.
 *
 * 실제 방식은 Ziggle과 같은 인증 제공자의 OAuth 2.0/OIDC 또는 세션 연동이 될 것이나
 * 아직 확정되지 않았다 (명세 15장 13번). endpoint를 추측해 고정하지 않고 이 계약
 * 뒤에 둔다. 확정되면 이 인터페이스를 구현하는 adapter만 새로 만든다.
 *
 * 토큰은 이 계층 밖으로 나가지 않는다. 화면은 `SessionUser`만 본다.
 */
export interface AuthAdapter {
  /**
   * 앱 시작 시 기존 세션을 복원한다. 세션이 없으면 null.
   * 실패하면 던진다 — 호출부가 `error` 상태로 옮긴다.
   */
  restore(signal?: AbortSignal): Promise<SessionUser | null>;

  /**
   * 로그인을 시작한다.
   *
   * 실제 구현에서는 인증 제공자로 브라우저를 넘기므로 이 Promise가 끝나지 않을 수
   * 있다. 그 경우 돌아온 뒤 `restore()`가 세션을 복원한다. 개발용 mock은 즉시
   * 사용자를 돌려준다.
   *
   * `returnTo`는 로그인 후 돌아갈 앱 내부 경로다. 외부 주소를 넘기지 않는다.
   */
  signIn(returnTo: string): Promise<SessionUser | null>;

  signOut(): Promise<void>;
}
