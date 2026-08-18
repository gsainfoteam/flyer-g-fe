import "@testing-library/jest-dom/vitest";

/**
 * 테스트는 실제 시간에 의존하지 않는다. 명세 17장 완료 정의.
 * 개별 테스트가 필요하면 `vi.setSystemTime`으로 이 기준 시각을 옮긴다.
 */
export const TEST_NOW = new Date("2026-06-08T03:00:00.000Z");
