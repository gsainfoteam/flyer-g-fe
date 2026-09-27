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

    await client.request({
      path: "/signage/submissions",
      query: { status: "PENDING_REVIEW", cursor: null },
    });

    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe(
      "https://api.example.com/v1/signage/submissions?status=PENDING_REVIEW",
    );
    expect(init.method).toBe("GET");
  });

  it("idempotency key를 헤더로 보낸다", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({}));
    const client = createHttpClient({
      baseUrl: "https://api.example.com",
      fetchImpl,
    });

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
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        jsonResponse(
          {
            code: "REVIEW_CONFLICT",
            message: "이미 처리됨",
            requestId: "req-9",
          },
          { status: 409 },
        ),
      );
    const client = createHttpClient({
      baseUrl: "https://api.example.com",
      fetchImpl,
    });

    await expect(client.request({ path: "/x" })).rejects.toMatchObject({
      code: "REVIEW_CONFLICT",
      status: 409,
      requestId: "req-9",
    });
  });

  it("오류 본문이 없으면 status로 code를 정한다", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        new Response("", { status: 500, headers: { "x-request-id": "req-h" } }),
      );
    const client = createHttpClient({
      baseUrl: "https://api.example.com",
      fetchImpl,
    });

    await expect(client.request({ path: "/x" })).rejects.toMatchObject({
      code: "SERVER_ERROR",
      requestId: "req-h",
    });
  });

  it("네트워크 실패를 ApiError로 정규화한다", async () => {
    const fetchImpl = vi
      .fn()
      .mockRejectedValue(new TypeError("Failed to fetch"));
    const client = createHttpClient({
      baseUrl: "https://api.example.com",
      fetchImpl,
    });

    const error: unknown = await client
      .request({ path: "/x" })
      .catch((cause: unknown) => cause);
    expect(isApiError(error)).toBe(true);
    expect((error as ApiError).code).toBe("NETWORK_ERROR");
  });

  it("204 응답은 본문 없이 끝낸다", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 204 }));
    const client = createHttpClient({
      baseUrl: "https://api.example.com",
      fetchImpl,
    });
    await expect(client.request({ path: "/x" })).resolves.toBeUndefined();
  });

  it("호출자가 취소하면 요청도 취소되고 canceled로 알린다", async () => {
    // 실제 fetch처럼 이미 끊긴 signal이면 바로, 아니면 끊기는 순간 실패한다.
    const fetchImpl = vi.fn(
      (_url: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          const abort = () => reject(new DOMException("Aborted", "AbortError"));
          if (init?.signal?.aborted) abort();
          else init?.signal?.addEventListener("abort", abort);
        }),
    );
    const client = createHttpClient({
      baseUrl: "https://api.example.com",
      fetchImpl,
    });
    const controller = new AbortController();

    const pending = client.request({ path: "/x", signal: controller.signal });
    controller.abort();

    await expect(pending).rejects.toMatchObject({ kind: "canceled" });
  });

  it("제한 시간 안에 응답이 없으면 timeout으로 끊는다", async () => {
    vi.useFakeTimers();
    try {
      const fetchImpl = vi.fn(
        (_url: RequestInfo | URL, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () =>
              reject(new DOMException("Aborted", "AbortError")),
            );
          }),
      );
      const client = createHttpClient({
        baseUrl: "https://api.example.com",
        fetchImpl,
        timeoutMs: 1_000,
      });

      const pending = client.request({ path: "/slow" });
      const assertion = expect(pending).rejects.toMatchObject({
        kind: "timeout",
        code: "TIMEOUT",
      });
      await vi.advanceTimersByTimeAsync(1_000);
      await assertion;
    } finally {
      vi.useRealTimers();
    }
  });

  it("응답 없이 실패한 fetch는 네트워크 오류다", async () => {
    const fetchImpl = vi
      .fn()
      .mockRejectedValue(new TypeError("Failed to fetch"));
    const client = createHttpClient({
      baseUrl: "https://api.example.com",
      fetchImpl,
    });

    await expect(client.request({ path: "/x" })).rejects.toMatchObject({
      kind: "network",
      code: "NETWORK_ERROR",
    });
  });

  it("서버 422의 필드 오류를 그대로 전달한다", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse(
        {
          code: "VALIDATION_FAILED",
          message: "invalid",
          fields: { endAt: "기간이 너무 길어요.", ignored: 3 },
        },
        { status: 422 },
      ),
    );
    const client = createHttpClient({
      baseUrl: "https://api.example.com",
      fetchImpl,
    });

    await expect(client.request({ path: "/x" })).rejects.toMatchObject({
      status: 422,
      fields: { endAt: "기간이 너무 길어요." },
    });
  });

  it("인증 헤더를 준비하지 못해도 ApiError로 알린다", async () => {
    const client = createHttpClient({
      baseUrl: "https://api.example.com",
      fetchImpl: vi.fn(),
      getAuthHeaders: async () => {
        throw new Error("token refresh failed");
      },
    });

    const error = await client.request({ path: "/x" }).catch((cause) => cause);
    expect(isApiError(error)).toBe(true);
    expect((error as ApiError).message).not.toContain("token");
  });

  describe("401 뒤 세션 갱신", () => {
    const unauthorized = () =>
      jsonResponse(
        { code: "UNAUTHENTICATED", message: "만료" },
        { status: 401 },
      );

    it("갱신에 성공하면 새 인증 헤더로 한 번 다시 보낸다", async () => {
      let token = "old";
      const fetchImpl = vi
        .fn()
        .mockResolvedValueOnce(unauthorized())
        .mockResolvedValueOnce(jsonResponse({ ok: true }));
      const onUnauthorized = vi.fn(async () => {
        token = "new";
        return true;
      });
      const client = createHttpClient({
        baseUrl: "https://api.example.com",
        fetchImpl,
        getAuthHeaders: async () => ({ Authorization: `Bearer ${token}` }),
        onUnauthorized,
      });

      await expect(client.request({ path: "/x" })).resolves.toEqual({
        ok: true,
      });
      expect(onUnauthorized).toHaveBeenCalledTimes(1);
      expect(fetchImpl.mock.calls[1]![1].headers.Authorization).toBe(
        "Bearer new",
      );
    });

    it("다시 보낸 요청도 401이면 더 갱신하지 않고 던진다", async () => {
      const fetchImpl = vi.fn().mockImplementation(async () => unauthorized());
      const onUnauthorized = vi.fn(async () => true);
      const client = createHttpClient({
        baseUrl: "https://api.example.com",
        fetchImpl,
        onUnauthorized,
      });

      await expect(client.request({ path: "/x" })).rejects.toMatchObject({
        code: "UNAUTHENTICATED",
        status: 401,
      });
      expect(onUnauthorized).toHaveBeenCalledTimes(1);
      expect(fetchImpl).toHaveBeenCalledTimes(2);
    });

    it("갱신하지 못하면 원래 401을 던진다", async () => {
      const fetchImpl = vi.fn().mockResolvedValue(unauthorized());
      const client = createHttpClient({
        baseUrl: "https://api.example.com",
        fetchImpl,
        onUnauthorized: async () => {
          throw new Error("refresh failed");
        },
      });

      await expect(client.request({ path: "/x" })).rejects.toMatchObject({
        code: "UNAUTHENTICATED",
      });
      expect(fetchImpl).toHaveBeenCalledTimes(1);
    });

    it("변경 요청은 같은 idempotency key로 다시 보낸다", async () => {
      const fetchImpl = vi
        .fn()
        .mockResolvedValueOnce(unauthorized())
        .mockResolvedValueOnce(jsonResponse({ id: "sub-1" }, { status: 201 }));
      const client = createHttpClient({
        baseUrl: "https://api.example.com",
        fetchImpl,
        onUnauthorized: async () => true,
      });

      await client.request({
        method: "POST",
        path: "/signage/submissions",
        body: { title: "제목" },
        idempotencyKey: "key-1",
      });

      expect(fetchImpl.mock.calls[1]![1].headers["Idempotency-Key"]).toBe(
        "key-1",
      );
      expect(fetchImpl.mock.calls[1]![1].body).toBe(
        JSON.stringify({ title: "제목" }),
      );
    });
  });
});
