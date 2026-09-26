/**
 * Ziggle 공지 (명세 FR-INT-01).
 *
 * 하나의 게시 신청은 반드시 하나의 Ziggle 공지 원문을 참조한다. 신청 폼의 제목,
 * 카테고리, 조직, 상세 URL은 이 값에서 자동으로 채운다.
 *
 * 실제 Ziggle 공지 조회 API의 존재 여부와 응답 형태는 미결정이다(명세 15장 14번).
 * 이 타입은 화면이 필요로 하는 최소 집합이며, 계약이 확정되면 adapter에서 맞춘다.
 */
export interface ZiggleNotice {
  id: string;
  title: string;
  /** Ziggle 분류. 식별자 체계 미결정(명세 15장 17번) */
  categoryId: string;
  /** 작성 조직. 개인 작성이면 null일 수 있다. */
  organizationName: string | null;
  /** 공식 상세 URL. QR과 상세 링크의 원천이다. 형식 미결정(명세 15장 15번) */
  detailUrl: string;
  /** 공지 본문 요약. 미리보기 부제로 쓴다. */
  summary: string | null;
  /** 공지에 적힌 장소. 없으면 null. */
  location: string | null;
  publishedAt: Date;
}
