import { describe, expect, it } from "vitest";
import {
  ApiError,
  codeForStatus,
  isRetryableError,
  normalizeApiError,
  toTraceLabel,
  toUserMessage,
} from "./error";

describe("normalizeApiError", () => {
  it("ApiError는 그대로 통과시킨다", () => {
    const error = new ApiError({ kind: "http", code: "X", message: "m" });
    expect(normalizeApiError(error)).toBe(error);
  });

  it("AbortError를 취소로 정규화한다", () => {
    const error = normalizeApiError(new DOMException("Aborted", "AbortError"));
    expect(error.kind).toBe("canceled");
    expect(error.code).toBe("REQUEST_CANCELED");
  });

  it("fetch의 TypeError를 네트워크 오류로 정규화한다", () => {
    expect(normalizeApiError(new TypeError("Failed to fetch")).code).toBe(
      "NETWORK_ERROR",
    );
  });

  it("알 수 없는 값도 ApiError로 좁힌다", () => {
    const error = normalizeApiError({ secret: "token-should-not-leak" });
    expect(error).toBeInstanceOf(ApiError);
    expect(error.code).toBe("UNKNOWN_ERROR");
    expect(error.message).not.toContain("token");
  });
});

describe("codeForStatus", () => {
  it("HTTP status를 안정적인 code로 옮긴다", () => {
    expect(codeForStatus(401)).toBe("UNAUTHENTICATED");
    expect(codeForStatus(409)).toBe("CONFLICT");
    expect(codeForStatus(503)).toBe("SERVER_ERROR");
    expect(codeForStatus(418)).toBe("HTTP_ERROR");
  });
});

describe("toUserMessage", () => {
  it("API 오류 모델과 화면 문구를 분리한다", () => {
    const error = new ApiError({
      kind: "http",
      code: "CONFLICT",
      message: "row version mismatch at submissions.version",
      status: 409,
    });
    const message = toUserMessage(error);
    expect(message).toContain("다른 사용자가 먼저 처리했습니다");
    expect(message).not.toContain("submissions.version");
  });

  it("5xx는 내부 사정을 드러내지 않는 일반 문구를 쓴다", () => {
    const error = new ApiError({
      kind: "http",
      code: "SERVER_ERROR",
      message: "NullPointerException at ReviewService.java:88",
      status: 500,
    });
    expect(toUserMessage(error)).not.toContain("ReviewService");
  });
});

describe("isRetryableError", () => {
  const http = (status: number) =>
    new ApiError({ kind: "http", code: codeForStatus(status), message: "m", status });

  it("네트워크 오류와 5xx·408·429는 재시도한다", () => {
    expect(isRetryableError(new TypeError("Failed to fetch"))).toBe(true);
    expect(isRetryableError(http(500))).toBe(true);
    expect(isRetryableError(http(503))).toBe(true);
    expect(isRetryableError(http(408))).toBe(true);
    expect(isRetryableError(http(429))).toBe(true);
  });

  it("다시 보내도 결과가 같은 4xx와 취소는 재시도하지 않는다", () => {
    for (const status of [400, 401, 403, 404, 409, 422]) {
      expect(isRetryableError(http(status))).toBe(false);
    }
    expect(
      isRetryableError(new DOMException("aborted", "AbortError")),
    ).toBe(false);
  });
});

describe("toTraceLabel", () => {
  it("requestId가 있을 때만 추적 문구를 만든다", () => {
    expect(
      toTraceLabel(
        new ApiError({
          kind: "http",
          code: "SERVER_ERROR",
          message: "m",
          requestId: "req-1",
        }),
      ),
    ).toBe("요청 ID: req-1");
    expect(
      toTraceLabel(new ApiError({ kind: "http", code: "X", message: "m" })),
    ).toBeNull();
  });
});
