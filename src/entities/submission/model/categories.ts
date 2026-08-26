/**
 * 게시 카테고리 목록.
 *
 * 장기적으로는 Ziggle 분류 체계가 단일 원천이어야 한다(명세 6.2). Ziggle이 어떤
 * 식별자로 카테고리를 주는지가 아직 미결정(명세 15장 17번)이라, 지금은 프론트가
 * 임시 id를 정의하고 `categoryId`로 서버에 보낸다. 계약이 확정되면 이 파일만
 * 서버 목록 조회로 교체하고 화면은 그대로 둔다.
 */
export interface SubmissionCategory {
  id: string;
  name: string;
}

export const SUBMISSION_CATEGORIES: readonly SubmissionCategory[] = [
  { id: "notice", name: "공지" },
  { id: "club", name: "동아리" },
  { id: "performance", name: "공연" },
  { id: "event", name: "행사" },
  { id: "department", name: "학과" },
] as const;

export function findCategory(
  categoryId: string,
): SubmissionCategory | undefined {
  return SUBMISSION_CATEGORIES.find((category) => category.id === categoryId);
}

/** 알 수 없는 id는 그대로 보여준다. 화면이 빈칸이 되는 것보다 낫다. */
export function getCategoryName(categoryId: string): string {
  return findCategory(categoryId)?.name ?? categoryId;
}

export function isKnownCategory(categoryId: string): boolean {
  return findCategory(categoryId) !== undefined;
}
