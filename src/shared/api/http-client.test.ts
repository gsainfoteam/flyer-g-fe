import { describe, expect, it, vi } from "vitest";
import { isApiError } from "./error";
import type { ApiError } from "./error";
import { createHttpClient } from "./http-client";

function jsonResponse(
  body: unknown,
  init: { status?: number; headers?: Record<string, string> } = {},
): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { "Content-Type": "application/json", ...init.headers },
  });
}

describe("createHttpClient", () => {
  it("base URL과 query를 합쳐 요청한다", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
    const client = createHttpClient({
      baseUrl: "https://api.example.com/v1/",
      fetchImpl,
    });

    await client.request({ path: "/signage/submissions", query: { status: "PENDING_REVIEW", cursor: null } });

    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe(
      "https://api.example.com/v1/signage/submissions?status=PENDING_REVIEW",
    );
    expect(init.method).toBe("GET");
  });

  it("idempotency key를 헤더로 보낸다", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({}));
    const client = createHttpClient({ baseUrl: "https://api.example.com", fetchImpl });

    await client.request({
      method: "POST",
      path: "/signage/submissions",
      body: { title: "제목" },
      idempotencyKey: "key-1",
    });

    const init = fetchImpl.mock.calls[0]![1];
    expect(init.headers["Idempotency-Key"]).toBe("key-1");
    expect(init.headers["Content-Type"]).toBe("application/json");
  });

  it("오류 응답의 code, message, requestId를 ApiError로 옮긴다", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse(
        { code: "REVIEW_CONFLICT", message: "이미 처리됨", requestId: "req-9" },
        { status: 409 },
      ),
    );
    const client = createHttpClient({ baseUrl: "https://api.example.com", fetchImpl });

    await expect(client.request({ path: "/x" })).rejects.toMatchObject({
      code: "REVIEW_CONFLICT",
      status: 409,
      requestId: "req-9",
    });
  });

  it("오류 본문이 없으면 status로 code를 정한다", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(new Response("", { status: 500, headers: { "x-request-id": "req-h" } }));
    const client = createHttpClient({ baseUrl: "https://api.example.com", fetchImpl });

    await expect(client.request({ path: "/x" })).rejects.toMatchObject({
      code: "SERVER_ERROR",
      requestId: "req-h",
    });
  });

  it("네트워크 실패를 ApiError로 정규화한다", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    const client = createHttpClient({ baseUrl: "https://api.example.com", fetchImpl });

    const error: unknown = await client
      .request({ path: "/x" })
      .catch((cause: unknown) => cause);
    expect(isApiError(error)).toBe(true);
    expect((error as ApiError).code).toBe("NETWORK_ERROR");
  });

  it("204 응답은 본문 없이 끝낸다", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    const client = createHttpClient({ baseUrl: "https://api.example.com", fetchImpl });
    await expect(client.request({ path: "/x" })).resolves.toBeUndefined();
  });

  it("AbortSignal을 그대로 전달한다", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({}));
    const client = createHttpClient({ baseUrl: "https://api.example.com", fetchImpl });
    const controller = new AbortController();

    await client.request({ path: "/x", signal: controller.signal });
    expect(fetchImpl.mock.calls[0]![1].signal).toBe(controller.signal);
  });
});
