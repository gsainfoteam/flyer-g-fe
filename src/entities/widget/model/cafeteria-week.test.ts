import { describe, expect, it } from "vitest";
import { cafeteriaDataFor } from "./cafeteria-week";
import { buildCafeteriaContent } from "./data-content";

const meals = [{ type: "LUNCH", hours: null, menus: ["흑미밥", "닭갈비"] }];
const WEEK = {
  fetchedAt: "2026-11-01T00:00:00Z",
  places: [
    { place: "제1학생식당", title: "10월5주", days: [{ date: "2026-10-30", meals }] },
    { place: "제2학생식당", title: "10월5주", days: [{ date: "2026-11-01", meals }] },
  ],
  errors: [],
};
/** 2026-11-01 정오(서울) */
const NOON = new Date("2026-11-01T03:00:00Z");

describe("cafeteriaDataFor", () => {
  it("식당을 정하지 않으면 오늘 식단이 있는 첫 식당", () => {
    const data = cafeteriaDataFor(WEEK, undefined, NOON);
    expect(data).toMatchObject({ place: "제2학생식당", servedOn: "2026-10-31T15:00:00.000Z" });
    // 학식 위젯이 그대로 읽는다.
    expect(buildCafeteriaContent({ data }, NOON)).toMatchObject({ place: "제2학생식당" });
  });

  it("정한 식당에 오늘 식단이 없으면 null", () => {
    expect(cafeteriaDataFor(WEEK, "제1학생식당", NOON)).toBeNull();
    expect(cafeteriaDataFor(WEEK, "제2학생식당", NOON)).not.toBeNull();
  });

  it("모양이 틀리면 null", () => {
    expect(cafeteriaDataFor(null, undefined, NOON)).toBeNull();
    expect(cafeteriaDataFor({ places: "x" }, undefined, NOON)).toBeNull();
  });
});
