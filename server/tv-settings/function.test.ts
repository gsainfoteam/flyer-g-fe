// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { onRequestGet, onRequestPut } from "../../functions/api/tv-settings";

function memoryKv(initial: string | null = null) {
  let value = initial;
  return {
    get: vi.fn(async () => value),
    put: vi.fn(async (_key: string, next: string) => {
      value = next;
    }),
  };
}

const put = (body: unknown, token: string | null = "Bearer admin") =>
  new Request("https://stg.flyer-g.gistory.me/api/tv-settings", {
    method: "PUT",
    headers: token ? { Authorization: token } : {},
    body: JSON.stringify(body),
  });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("/api/tv-settings", () => {
  it("KV가 없으면 읽기는 빈 설정, 저장은 503이다", async () => {
    const read = await onRequestGet({ request: new Request("https://x/api/tv-settings"), env: {} });
    expect(await read.json()).toEqual({});
    const write = await onRequestPut({ request: put({ timeSlots: [] }), env: {} });
    expect(write.status).toBe(503);
  });

  it("운영자 목록을 불러오지 못하면(운영자가 아니면) 저장하지 않는다", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 403 }));
    vi.stubGlobal("fetch", fetchMock);
    const kv = memoryKv();
    const response = await onRequestPut({ request: put({ timeSlots: [] }), env: { TV_SETTINGS: kv } });
    expect(response.status).toBe(403);
    expect(kv.put).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.stg.flyer-g.gistory.me/signage/users?limit=1",
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer admin" }) }),
    );
    const anonymous = await onRequestPut({ request: put({}, null), env: { TV_SETTINGS: kv } });
    expect(anonymous.status).toBe(403);
  });

  it("운영자면 합쳐 저장하고, 다음 읽기에 보인다", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ items: [] })));
    const kv = memoryKv(JSON.stringify({ devices: { a: { widgets: [] } }, timeSlots: null }));
    const rule = { id: "r", widget: "QUIZ", dates: { from: "2026-11-03", to: "2026-11-03" }, time: { from: "12:00", to: "13:00" }, label: "점심" };
    const response = await onRequestPut({ request: put({ timeSlots: [rule] }), env: { TV_SETTINGS: kv } });
    expect(response.status).toBe(200);
    const read = await onRequestGet({ request: new Request("https://x/api/tv-settings"), env: { TV_SETTINGS: kv } });
    expect(await read.json()).toMatchObject({ devices: { a: { widgets: [] } }, timeSlots: [rule] });
  });
});
