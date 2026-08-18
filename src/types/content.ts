/**
 * 초기 프로토타입의 레거시 타입.
 *
 * 새 코드는 `@/entities/submission`의 도메인 모델을 쓴다. 이 타입은
 * `toSignageSubmissionExpandedDto()` adapter가 목 fixture를 변환할 때만 참조한다.
 * 목 데이터를 새 모델로 다시 작성하면 이 파일과 `src/data/mockContents.ts`를 제거한다.
 */
export type ContentStatus = "published" | "scheduled" | "pending" | "ended";

export interface NoticeContent {
  id: string;
  title: string;
  subtitle?: string;
  category: string;
  organizer: string;
  status: ContentStatus;
  startDate: string;
  endDate?: string;
  location?: string;
  description?: string;
  posterUrl: string;
  linkUrl: string;
  qrCodeUrl: string;
  views: number;
  likes?: number;
}
