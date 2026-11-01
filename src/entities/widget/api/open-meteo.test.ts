import { describe, expect, it, vi } from "vitest";
import { airGrade, buildWeatherContent } from "../model/data-content";
import { fetchOpenMeteoWeather, skyOfWeatherCode, toWeatherData } from "./open-meteo";

/** 2026-11-01 18:15(서울)에 받은 응답을 줄인 것 */
const FORECAST = {
  current: { time: "2026-11-01T18:15", temperature_2m: 11.8, weather_code: 63 },
  hourly: {
    time: ["2026-11-01T18:00", "2026-11-01T19:00", "2026-11-01T20:00"],
    temperature_2m: [11.9, 11.2, 10.4],
    weather_code: [63, 3, 1],
  },
  daily: {
    time: ["2026-11-01", "2026-11-02"],
    temperature_2m_max: [16.1, 15.0],
    temperature_2m_min: [9.4, 7.8],
    precipitation_probability_max: [85, 10],
  },
};
const AIR = { current: { time: "2026-11-01T18:00", pm10: 12.9, pm2_5: 11.1 } };
const FETCHED_AT = new Date("2026-11-01T09:15:00Z");

describe("Open-Meteo 날씨", () => {
  it("WMO 날씨 코드를 하늘 상태로 묶는다", () => {
    expect([0, 2, 45, 61, 81, 95, 73, 86].map(skyOfWeatherCode)).toEqual([
      "CLEAR",
      "PARTLY_CLOUDY",
      "CLOUDY",
      "RAIN",
      "RAIN",
      "RAIN",
      "SNOW",
      "SNOW",
    ]);
    expect(skyOfWeatherCode(42)).toBeNull();
  });

  it("응답을 날씨 위젯 데이터로 바꾸고, 위젯이 그대로 읽는다", () => {
    const data = toWeatherData(FORECAST, AIR, FETCHED_AT)!;
    const content = buildWeatherContent({ data }, FETCHED_AT)!;
    expect(content).toMatchObject({
      temperature: 12,
      sky: "RAIN",
      high: 16,
      low: 9,
      precipitationChance: 85,
      source: "Open-Meteo 제공",
      location: "광주 북구 오룡동",
      air: { pm10: "GOOD", pm25: "GOOD" },
    });
    // 서울 시각(오프셋 없음)을 UTC로 바르게 읽는다.
    expect(content.hourly.map((hour) => hour.at.toISOString())).toEqual([
      "2026-11-01T09:00:00.000Z",
      "2026-11-01T10:00:00.000Z",
      "2026-11-01T11:00:00.000Z",
    ]);
  });

  it("대기질이 없어도 날씨는 보여 주고, 날씨 값이 빠지면 null", () => {
    expect(toWeatherData(FORECAST, null, FETCHED_AT)).toMatchObject({ air: null });
    expect(toWeatherData({ ...FORECAST, daily: {} }, AIR, FETCHED_AT)).toBeNull();
  });

  it("대기질 요청이 실패해도 날씨를 받는다", async () => {
    const fetchImpl = vi.fn(async (url: string) =>
      url.includes("air-quality")
        ? new Response("", { status: 503 })
        : new Response(JSON.stringify(FORECAST)),
    ) as unknown as typeof fetch;
    await expect(fetchOpenMeteoWeather(FETCHED_AT, undefined, fetchImpl)).resolves.toMatchObject({
      temperature: 11.8,
      air: null,
    });
  });
});

describe("airGrade", () => {
  it("환경부 기준으로 등급을 나눈다", () => {
    expect([30, 31, 80, 81, 150, 151].map((value) => airGrade("pm10", value))).toEqual([
      "GOOD",
      "NORMAL",
      "NORMAL",
      "BAD",
      "BAD",
      "VERY_BAD",
    ]);
    expect([15, 16, 35, 36, 75, 76].map((value) => airGrade("pm25", value))).toEqual([
      "GOOD",
      "NORMAL",
      "NORMAL",
      "BAD",
      "BAD",
      "VERY_BAD",
    ]);
    expect(airGrade("pm10", null)).toBeNull();
  });
});
