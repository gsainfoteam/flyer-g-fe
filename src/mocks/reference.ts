import type {
  Category,
  SignageConfig,
} from "@/entities/submission/model/policy";

/**
 * 참조 데이터 fixture. 값은 백엔드 초기값을 그대로 옮겼다
 * (`API-CHANGES-BACKEND.md` 10절, `flyer-g-be` `signage-policy.ts`).
 * 화면은 이 값을 상수로 쓰지 않고 `reference` repository로 받는다.
 */
export const CATEGORY_FIXTURES: readonly Category[] = [
  { id: "notice", name: "공지" },
  { id: "club", name: "동아리" },
  { id: "performance", name: "공연" },
  { id: "event", name: "행사" },
  { id: "department", name: "학과·부서" },
];

export const SIGNAGE_CONFIG_FIXTURE: SignageConfig = {
  maxUploadBytes: 10 * 1024 * 1024,
  minShortEdgePx: 1080,
  titleMaxLength: 80,
  maxPublishMonths: 3,
  minLeadTimeHours: 24,
  allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  allowedDetailUrlHosts: ["ziggle.gistory.me"],
};

/** 서버가 신청 응답에 싣는 카테고리 이름. 모르는 id는 그대로 둔다. */
export function categoryNameOf(categoryId: string): string {
  return (
    CATEGORY_FIXTURES.find((category) => category.id === categoryId)?.name ??
    categoryId
  );
}
