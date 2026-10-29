import { describe, expect, it } from "vitest";
import {
  buildCafeteriaContent,
  buildRestaurantContent,
  buildWeatherContent,
  currentMealType,
} from "./data-content";
import { seededRandom } from "./content";

const at = (iso: string) => new Date(iso);

describe("buildCafeteriaContent", () => {
  const params = (servedOn: string, meals: unknown[]) => ({
    data: { servedOn, place: "제2학생식당", meals },
  });
  const allMeals = [
    { type: "DINNER", hours: "17:30~19:00", menus: ["카레라이스"] },
    { type: "BREAKFAST", menus: ["북엇국"] },
    { type: "LUNCH", menus: ["김치찌개", " "] },
  ];

  it("끼니를 아침·점심·저녁 순으로 두고 지금 끼니를 고른다", () => {
    // 서울 12시
    const content = buildCafeteriaContent(
      params("2026-10-28T00:00:00Z", allMeals),
      at("2026-10-28T03:00:00Z"),
    );
    expect(content?.meals.map((meal) => meal.type)).toEqual([
      "BREAKFAST",
      "LUNCH",
      "DINNER",
    ]);
    expect(content?.current).toBe("LUNCH");
    expect(content?.meals[1]!.menus).toEqual(["김치찌개"]);
  });

  it("오늘 메뉴가 아니면 내린다", () => {
    expect(
      buildCafeteriaContent(
        params("2026-10-27T00:00:00Z", allMeals),
        at("2026-10-28T03:00:00Z"),
      ),
    ).toBeNull();
  });

  it("지금 끼니가 없으면 다음 끼니를 고른다", () => {
    // 서울 8시인데 아침이 없는 날
    const content = buildCafeteriaContent(
      params("2026-10-28T00:00:00Z", allMeals.filter((meal) => meal.type !== "BREAKFAST")),
      at("2026-10-27T23:00:00Z"),
    );
    expect(content?.current).toBe("LUNCH");
  });

  it("모양이 틀린 데이터는 버린다", () => {
    expect(buildCafeteriaContent({ data: "x" }, at("2026-10-28T03:00:00Z"))).toBeNull();
    expect(
      buildCafeteriaContent(
        params("2026-10-28T00:00:00Z", [{ type: "SNACK", menus: ["빵"] }]),
        at("2026-10-28T03:00:00Z"),
      ),
    ).toBeNull();
  });

  it("끼니 경계는 9시 30분과 14시다", () => {
    expect(currentMealType(at("2026-10-28T00:29:00Z"))).toBe("BREAKFAST");
    expect(currentMealType(at("2026-10-28T00:30:00Z"))).toBe("LUNCH");
    expect(currentMealType(at("2026-10-28T05:00:00Z"))).toBe("DINNER");
  });
});

describe("buildWeatherContent", () => {
  const data = {
    fetchedAt: "2026-10-28T03:00:00Z",
    location: "광주 북구 오룡동",
    temperature: 14.6,
    sky: "CLEAR",
    high: 18,
    low: 9,
    precipitationChance: 120,
    hourly: [
      { at: "2026-10-28T01:00:00Z", temperature: 12, sky: "CLEAR" },
      { at: "2026-10-28T04:00:00Z", temperature: 15, sky: "CLOUDY" },
      { at: "2026-10-28T05:00:00Z", temperature: 15, sky: "TORNADO" },
    ],
  };

  it("값을 반올림하고 지난 시각·모르는 하늘은 뺀다", () => {
    const content = buildWeatherContent({ data }, at("2026-10-28T03:30:00Z"));
    expect(content).toMatchObject({ temperature: 15, precipitationChance: 100 });
    expect(content?.hourly).toHaveLength(1);
  });

  it("3시간이 넘은 날씨는 내린다", () => {
    expect(buildWeatherContent({ data }, at("2026-10-28T06:01:00Z"))).toBeNull();
  });

  it("필수 값이 없으면 내린다", () => {
    expect(
      buildWeatherContent({ data: { ...data, sky: undefined } }, at("2026-10-28T03:30:00Z")),
    ).toBeNull();
  });
});

describe("buildRestaurantContent", () => {
  const places = ["가", "나", "다", "라"].map((name) => ({ name, category: "한식" }));

  it("서로 다른 세 곳을 고르고 같은 씨앗이면 같은 결과다", () => {
    const first = buildRestaurantContent({ data: { places } }, seededRandom("s"));
    const second = buildRestaurantContent({ data: { places } }, seededRandom("s"));
    expect(first).toEqual(second);
    const names = [first!.featured, ...first!.others].map((place) => place.name);
    expect(new Set(names).size).toBe(3);
  });

  it("가게가 없으면 내린다", () => {
    expect(buildRestaurantContent({ data: { places: [] } }, seededRandom("s"))).toBeNull();
    expect(buildRestaurantContent({}, seededRandom("s"))).toBeNull();
  });
});
