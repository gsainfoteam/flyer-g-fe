import { CAFETERIAS, fetchCafeteriaWeek } from "../../server/cafeteria/board";

/**
 * GET /api/cafeteria — 이번 주 학식 (Cloudflare Pages Functions)
 *
 * TV가 학교 홈페이지를 직접 부를 수 없어(CORS) 같은 도메인의 이 함수가 대신 읽는다.
 * 백엔드 학식(flyer-g-be#25, #31)이 생기기 전까지 쓰는 시제품이다.
 *
 * 학교 사이트 부담과 함수 CPU 시간을 줄이려고 결과를 Cloudflare 캐시에 둔다. 캐시 키에
 * 서울 날짜를 넣어 날이 바뀌면 새로 읽는다. 다 읽었으면 3시간, 식당이 실패했거나 오늘
 * 식단이 아직 없으면(새 주 글이 올라오기 전) 30분만 둔다. 식당 하나가 실패해도 나머지는
 * 보내고, 모두 실패하면 502다(TV는 학식 위젯을 건너뛴다).
 *
 * 브라우저(TV)에는 늘 30분까지만 두게 한다. 캐시에서 꺼낸 응답에 붙은 긴 수명을 그대로
 * 넘기면 엣지 캐시가 새로 읽어도 TV가 오래된 것을 쓴다.
 */

const EDGE_TTL_SECONDS = 3 * 60 * 60;
const SHORT_TTL_SECONDS = 30 * 60;
const BROWSER_TTL_SECONDS = 30 * 60;

interface PagesContext {
  request: Request;
  waitUntil(promise: Promise<unknown>): void;
}

const seoulDate = (now: Date) =>
  new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);

const json = (body: unknown, status: number, maxAge: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": `public, max-age=${maxAge}`,
    },
  });

export async function onRequestGet({ request, waitUntil }: PagesContext): Promise<Response> {
  const now = new Date();
  const cache = (globalThis.caches as unknown as { default?: Cache } | undefined)?.default;
  const cacheKey = new Request(`${new URL(request.url).origin}/api/cafeteria?day=${seoulDate(now)}`);
  const cached = await cache?.match(cacheKey);
  if (cached) return json(await cached.json(), 200, BROWSER_TTL_SECONDS);

  const results = await Promise.allSettled(
    CAFETERIAS.map((cafeteria) => fetchCafeteriaWeek(cafeteria, now)),
  );
  const places = results.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
  const errors = results.flatMap((result) =>
    result.status === "rejected" ? [String(result.reason)] : [],
  );
  if (places.length === 0) {
    return json({ error: "CAFETERIA_UNAVAILABLE", errors }, 502, 0);
  }

  const body = { fetchedAt: now.toISOString(), places, errors };
  const today = seoulDate(now);
  const complete =
    errors.length === 0 &&
    places.every((place) => place.days.some((day) => day.date === today));
  const edgeTtl = complete ? EDGE_TTL_SECONDS : SHORT_TTL_SECONDS;
  if (cache) waitUntil(cache.put(cacheKey, json(body, 200, edgeTtl)));
  return json(body, 200, BROWSER_TTL_SECONDS);
}
