import { getSeoulParts, parseIsoUtc } from "@/shared/lib/datetime";

/**
 * 서버가 모아 보내는 외부 데이터 위젯(학식·날씨·맛집)의 내용.
 *
 * `params.data`는 서버가 보낸 그대로라 믿지 않고 읽는다. 모양이 틀리거나 오래된
 * 데이터는 null로 돌려 편성에서 뺀다. 어제 학식이나 반나절 지난 날씨를 보여 주는
 * 것보다 안 보여 주는 편이 낫다.
 */

export const MEAL_TYPES = ["BREAKFAST", "LUNCH", "DINNER"] as const;
export type MealType = (typeof MEAL_TYPES)[number];

export interface CafeteriaMeal {
  type: MealType;
  /** "07:30~09:00" */
  hours: string | null;
  menus: string[];
}

export interface CafeteriaContent {
  type: "CAFETERIA";
  place: string;
  meals: CafeteriaMeal[];
  /** 지금 시각에 맞는 끼니. 강조해서 그린다. */
  current: MealType;
}

export const SKY_TYPES = ["CLEAR", "PARTLY_CLOUDY", "CLOUDY", "RAIN", "SNOW"] as const;
export type Sky = (typeof SKY_TYPES)[number];

export interface WeatherHour {
  at: Date;
  temperature: number;
  sky: Sky;
}

export interface WeatherContent {
  type: "WEATHER";
  location: string;
  temperature: number;
  sky: Sky;
  high: number;
  low: number;
  /** 강수확률(%) */
  precipitationChance: number;
  hourly: WeatherHour[];
  fetchedAt: Date;
  /** 데이터 제공처 표기. 기상청 자료는 공공누리 1유형이라 출처를 밝혀야 한다. */
  source: string;
}

export interface RestaurantPlace {
  name: string;
  category: string;
  address: string;
  /** 가게 원본 페이지. 있으면 TV에 QR로 보여 준다(지도·검색 API 약관의 원본 링크). */
  url: string | null;
}

export interface RestaurantContent {
  type: "RESTAURANT";
  featured: RestaurantPlace;
  others: RestaurantPlace[];
  /** 데이터 제공처 표기. 네이버 지역검색 약관이 출처 표시를 요구한다. */
  source: string;
}

/** 날씨를 믿는 시간. 서버가 이보다 오래 갱신하지 못하면 내린다. */
export const WEATHER_STALE_MS = 3 * 60 * 60 * 1000;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readText = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const readNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

/** QR로 띄울 주소. 폰이 열 수 있는 http(s)만 받는다. */
function readWebUrl(value: unknown): string | null {
  const text = readText(value);
  if (!text) return null;
  try {
    const url = new URL(text);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function readTime(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  try {
    return parseIsoUtc(value);
  } catch {
    return null;
  }
}

function readEnum<T extends string>(values: readonly T[], value: unknown): T | null {
  return typeof value === "string" && (values as readonly string[]).includes(value)
    ? (value as T)
    : null;
}

function sameSeoulDay(a: Date, b: Date): boolean {
  const x = getSeoulParts(a);
  const y = getSeoulParts(b);
  return x.year === y.year && x.month === y.month && x.day === y.day;
}

/** 아침은 9시 30분, 점심은 14시까지. 그 뒤로는 저녁을 강조한다. */
export function currentMealType(now: Date): MealType {
  const { hour24, minute } = getSeoulParts(now);
  const minutes = hour24 * 60 + minute;
  if (minutes < 9 * 60 + 30) return "BREAKFAST";
  if (minutes < 14 * 60) return "LUNCH";
  return "DINNER";
}

export function buildCafeteriaContent(
  params: Record<string, unknown>,
  now: Date,
): CafeteriaContent | null {
  const data = params.data;
  if (!isRecord(data)) return null;
  const servedOn = readTime(data.servedOn);
  // 오늘 메뉴가 아니면 내린다. 휴무일에는 서버가 데이터를 보내지 않는다.
  if (!servedOn || !sameSeoulDay(servedOn, now)) return null;
  if (!Array.isArray(data.meals)) return null;

  const meals = data.meals.flatMap((raw): CafeteriaMeal[] => {
    if (!isRecord(raw)) return [];
    const type = readEnum(MEAL_TYPES, raw.type);
    const menus = Array.isArray(raw.menus)
      ? raw.menus.flatMap((menu) => readText(menu) ?? [])
      : [];
    if (!type || menus.length === 0) return [];
    return [{ type, hours: readText(raw.hours), menus }];
  });
  if (meals.length === 0) return null;

  meals.sort((a, b) => MEAL_TYPES.indexOf(a.type) - MEAL_TYPES.indexOf(b.type));
  const wanted = currentMealType(now);
  // 지금 끼니가 없으면(주말 아침 미운영 등) 다음 끼니, 그것도 없으면 마지막 끼니
  const current =
    meals.find((meal) => MEAL_TYPES.indexOf(meal.type) >= MEAL_TYPES.indexOf(wanted))
      ?.type ?? meals[meals.length - 1]!.type;

  return {
    type: "CAFETERIA",
    place: readText(data.place) ?? "학생식당",
    meals,
    current,
  };
}

export function buildWeatherContent(
  params: Record<string, unknown>,
  now: Date,
): WeatherContent | null {
  const data = params.data;
  if (!isRecord(data)) return null;
  const fetchedAt = readTime(data.fetchedAt);
  if (!fetchedAt || now.getTime() - fetchedAt.getTime() > WEATHER_STALE_MS) {
    return null;
  }

  const temperature = readNumber(data.temperature);
  const sky = readEnum(SKY_TYPES, data.sky);
  const high = readNumber(data.high);
  const low = readNumber(data.low);
  const chance = readNumber(data.precipitationChance);
  if (temperature === null || !sky || high === null || low === null || chance === null) {
    return null;
  }

  const hourly = (Array.isArray(data.hourly) ? data.hourly : [])
    .flatMap((raw): WeatherHour[] => {
      if (!isRecord(raw)) return [];
      const at = readTime(raw.at);
      const temp = readNumber(raw.temperature);
      const hourSky = readEnum(SKY_TYPES, raw.sky);
      return at && temp !== null && hourSky ? [{ at, temperature: temp, sky: hourSky }] : [];
    })
    // 지난 시각은 빼고 앞으로 6칸만 보여 준다.
    .filter((hour) => hour.at.getTime() >= now.getTime() - 60 * 60 * 1000)
    .slice(0, 6);

  return {
    type: "WEATHER",
    location: readText(data.location) ?? "",
    temperature: Math.round(temperature),
    sky,
    high: Math.round(high),
    low: Math.round(low),
    precipitationChance: Math.min(100, Math.max(0, Math.round(chance))),
    hourly,
    fetchedAt,
    source: readText(data.source) ?? "",
  };
}

export function buildRestaurantContent(
  params: Record<string, unknown>,
  random: () => number,
): RestaurantContent | null {
  const data = params.data;
  if (!isRecord(data) || !Array.isArray(data.places)) return null;
  const pool = data.places.flatMap((raw): RestaurantPlace[] => {
    if (!isRecord(raw)) return [];
    const name = readText(raw.name);
    if (!name) return [];
    return [
      {
        name,
        category: readText(raw.category) ?? "",
        address: readText(raw.address) ?? "",
        url: readWebUrl(raw.url),
      },
    ];
  });
  if (pool.length === 0) return null;

  const picked: RestaurantPlace[] = [];
  while (picked.length < 3 && pool.length > 0) {
    picked.push(pool.splice(Math.floor(random() * pool.length), 1)[0]!);
  }
  return {
    type: "RESTAURANT",
    featured: picked[0]!,
    others: picked.slice(1),
    source: readText(data.source) ?? "",
  };
}
