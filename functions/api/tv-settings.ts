import { mergeTvSettings, MAX_SETTINGS_BYTES } from "../../server/tv-settings/merge";

/**
 * GET /api/tv-settings — TV 운영 설정(위젯·시간대 점유) 읽기. 누구나 읽는다(TV가 읽는다).
 * PUT /api/tv-settings — 운영자(SUPER_ADMIN)만 저장. 백엔드 위젯 API 대신 쓴다.
 *
 * 저장소는 Cloudflare KV(`TV_SETTINGS` 바인딩)의 한 키다. 바인딩이 없으면 읽기는 빈 설정,
 * 저장은 503이다(대시보드에서 KV를 연결해야 한다).
 *
 * 저장 권한은 요청의 Bearer 토큰으로 백엔드의 운영자 전용 목록(`GET /signage/users`)을
 * 불러 확인한다. 200이면 운영자다. 백엔드를 고치지 않고 같은 권한 규칙을 따른다.
 */

interface KvNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
}

interface PagesContext {
  request: Request;
  env: { TV_SETTINGS?: KvNamespace; API_BASE_URL?: string; VITE_API_BASE_URL?: string };
}

const KEY = "tv-settings";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });

/** 백엔드 주소. 환경 변수가 없으면 사이트 주소로 짐작한다(stg·운영). */
function apiBaseOf(request: Request, env: PagesContext["env"]): string | null {
  const configured = env.API_BASE_URL ?? env.VITE_API_BASE_URL;
  if (configured) return configured.replace(/\/$/, "");
  const host = new URL(request.url).hostname;
  if (host === "stg.flyer-g.gistory.me") return "https://api.stg.flyer-g.gistory.me";
  if (host === "flyer-g.gistory.me") return "https://api.flyer-g.gistory.me";
  return null;
}

async function isOperator(request: Request, env: PagesContext["env"]): Promise<boolean> {
  const authorization = request.headers.get("Authorization");
  const base = apiBaseOf(request, env);
  if (!authorization?.startsWith("Bearer ") || !base) return false;
  try {
    const response = await fetch(`${base}/signage/users?limit=1`, {
      headers: { Authorization: authorization, Accept: "application/json" },
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function onRequestGet({ env }: PagesContext): Promise<Response> {
  const stored = env.TV_SETTINGS ? await env.TV_SETTINGS.get(KEY) : null;
  // TV가 1분마다 읽는다. 저장 직후 관리 화면과 TV가 바로 새 값을 보도록 캐시하지 않는다.
  return json(stored ? JSON.parse(stored) : {});
}

export async function onRequestPut({ request, env }: PagesContext): Promise<Response> {
  if (!env.TV_SETTINGS) {
    return json({ code: "KV_NOT_BOUND", message: "설정 저장소(Cloudflare KV)가 연결되지 않았어요." }, 503);
  }
  if (!(await isOperator(request, env))) {
    return json({ code: "FORBIDDEN", message: "운영자만 TV 설정을 바꿀 수 있어요." }, 403);
  }
  const body = await request.text();
  if (body.length > MAX_SETTINGS_BYTES) {
    return json({ code: "TOO_LARGE", message: "설정이 너무 커요." }, 413);
  }
  let patch: unknown;
  try {
    patch = JSON.parse(body);
  } catch {
    return json({ code: "BAD_REQUEST", message: "설정 형식이 올바르지 않아요." }, 400);
  }
  const current = await env.TV_SETTINGS.get(KEY);
  const merged = mergeTvSettings(current ? JSON.parse(current) : {}, patch, new Date());
  if (!merged) return json({ code: "BAD_REQUEST", message: "설정 형식이 올바르지 않아요." }, 400);
  await env.TV_SETTINGS.put(KEY, JSON.stringify(merged));
  return json(merged);
}
