import type { ZiggleNotice } from "@/entities/notice";

/**
 * Ziggle 공지 조회 경계 (명세 FR-INT-01).
 *
 * 공지 조회 API가 존재하는지, 응답이 어떤 모양인지 아직 확정되지 않았다
 * (명세 15장 14번). 화면은 이 인터페이스만 알고, 계약이 확정되면 구현체만 바꾼다.
 * 요구사항은 `API-REQUIREMENTS.md` 1절에 적어 두었다.
 */
export interface ZiggleNoticeAdapter {
  /** 공지 하나. 없거나 권한이 없으면 ApiError를 던진다. */
  getById(noticeId: string, signal?: AbortSignal): Promise<ZiggleNotice>;

  /**
   * 로그인한 사용자가 게시 신청에 쓸 수 있는 공지 목록.
   *
   * `/studio`에 noticeId 없이 들어온 사용자가 공지를 고를 수 있어야 한다.
   * 실제 Ziggle에서는 공지 작성 화면에서 넘어오는 것이 기본 경로다.
   */
  listSubmittable(signal?: AbortSignal): Promise<ZiggleNotice[]>;
}
