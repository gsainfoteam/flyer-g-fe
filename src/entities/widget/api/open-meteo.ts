import type { Sky } from "../model/data-content";

/**
 * 서버가 날씨를 주지 않을 때 TV가 직접 받는 날씨 (Open-Meteo).
 *
 * 키가 없고 브라우저 호출(CORS)을 허용한다. 비상업 무료이며 출처를 밝혀야 한다
 * (CC BY 4.0). 미세먼지는 같은 곳의 대기질 API(CAMS 모델)에서 받는다.
 * 백엔드 날씨(flyer-g-be#27)가 생기면 그쪽 응답이 먼저 쓰인다.
 *
 * 돌려주는 값은 날씨 위젯 데이터와 같은 형식이다(`buildWeatherContent`).
 */

/** GIST(광주 북구 오룡동) */
const LATITUDE = 35.2286;
const LONGITUDE = 126.8431;
export const OPEN_METEO_LOCATION = "광주 북구 오룡동";
export const OPEN_METEO_SOURCE = "Open-Meteo 제공";

const FORECAST_URL =
  "https://api.open-meteo.com/v1/forecast" +
  `?latitude=${LATITUDE}&longitude=${LONGITUDE}` +
  "&current=temperature_2m,weather_code" +
  "&hourly=temperature_2m,weather_code" +
  "&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max" +
  "&timezone=Asia%2FSeoul&forecast_days=2";

const AIR_URL =
  "https://air-quality-api.open-meteo.com/v1/air-quality" +
  `?latitude=${LATITUDE}&longitude=${LONGITUDE}` +
  "&current=pm10,pm2_5&timezone=Asia%2FSeoul";

/** WMO 날씨 코드 → 하늘 상태. 안개는 흐림, 소나기·뇌우는 비로 묶는다. */
export function skyOfWeatherCode(code: number): Sky | null {
  if (code === 0) return "CLEAR";
  if (code === 1 || code === 2) return "PARTLY_CLOUDY";
  if (code === 3 || code === 45 || code === 48) return "CLOUDY";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "SNOW";
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95) return "RAIN";
  return null;
}

/** "2026-11-01T18:00"(서울 시각, 오프셋 없음) → Date */
const seoulTime = (value: unknown) =>
  typeof value === "string" ? new Date(`${value}:00+09:00`) : null;

const numberAt = (list: unknown, index: number) => {
  const value = Array.isArray(list) ? list[index] : undefined;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
};

const record = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};

/**
 * Open-Meteo 응답 → 날씨 위젯 데이터. 꼭 필요한 값이 없으면 null.
 * 대기질은 없어도 날씨는 보여 준다.
 */
export function toWeatherData(
  forecast: unknown,
  air: unknown,
  fetchedAt: Date,
): Record<string, unknown> | null {
  const current = record(record(forecast).current);
  const daily = record(record(forecast).daily);
  const hourly = record(record(forecast).hourly);

  const temperature = numberAt([current.temperature_2m], 0);
  const sky = skyOfWeatherCode(numberAt([current.weather_code], 0) ?? -1);
  const high = numberAt(daily.temperature_2m_max, 0);
  const low = numberAt(daily.temperature_2m_min, 0);
  const chance = numberAt(daily.precipitation_probability_max, 0);
  if (temperature === null || !sky || high === null || low === null || chance === null) {
    return null;
  }

  const times = Array.isArray(hourly.time) ? hourly.time : [];
  const hours = times.flatMap((time, index) => {
    const at = seoulTime(time);
    const temp = numberAt(hourly.temperature_2m, index);
    const hourSky = skyOfWeatherCode(numberAt(hourly.weather_code, index) ?? -1);
    return at && temp !== null && hourSky
      ? [{ at: at.toISOString(), temperature: temp, sky: hourSky }]
      : [];
  });

  const airNow = record(record(air).current);
  const pm10 = numberAt([airNow.pm10], 0);
  const pm25 = numberAt([airNow.pm2_5], 0);

  return {
    fetchedAt: fetchedAt.toISOString(),
    location: OPEN_METEO_LOCATION,
    source: OPEN_METEO_SOURCE,
    temperature,
    sky,
    high,
    low,
    precipitationChance: chance,
    hourly: hours,
    air: pm10 !== null || pm25 !== null ? { pm10, pm25 } : null,
  };
}

async function getJson(url: string, fetchImpl: typeof fetch, signal?: AbortSignal) {
  const response = await fetchImpl(url, { signal });
  if (!response.ok) throw new Error(`Open-Meteo ${response.status}`);
  return (await response.json()) as unknown;
}

export async function fetchOpenMeteoWeather(
  now: Date,
  signal?: AbortSignal,
  fetchImpl: typeof fetch = fetch,
): Promise<Record<string, unknown> | null> {
  // 대기질이 실패해도 날씨는 보여 준다.
  const [forecast, air] = await Promise.all([
    getJson(FORECAST_URL, fetchImpl, signal),
    getJson(AIR_URL, fetchImpl, signal).catch(() => null),
  ]);
  return toWeatherData(forecast, air, now);
}
