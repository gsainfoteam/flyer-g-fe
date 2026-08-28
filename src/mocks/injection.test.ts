import { beforeEach, describe, expect, it } from "vitest";
import { isApiError } from "@/shared/api/error";
import { createMockRepositories } from "./repositories";
import {
  FAIL_STORAGE_KEY,
  LATENCY_STORAGE_KEY,
  readInjectedFailure,
  setInjectedFailure,
  setInjectedLatencyMs,
  withInjection,
} from "./injection";

beforeEach(() => {
  sessionStorage.clear();
});

describe("mock 오류 주입", () => {
  it("주입된 status가 계약 형태의 ApiError로 나온다", () => {
    setInjectedFailure("submissions.create", 409);

    const error = readInjectedFailure("submissions.create");
    expect(error?.status).toBe(409);
    expect(error?.code).toBe("CONFLICT");
    expect(error?.requestId).toBeTruthy();
  });

  it("422는 필드 오류 형태까지 담는다", () => {
    setInjectedFailure("submissions.create", 422);
    const error = readInjectedFailure("submissions.create");
    expect(error?.fields).toBeTruthy();
  });

  it("* 는 모든 요청에 적용된다", () => {
    setInjectedFailure("*", 500);
    expect(readInjectedFailure("displays.getPlaylist")?.status).toBe(500);
  });

  it("해제하면 더 이상 실패하지 않는다", () => {
    setInjectedFailure("submissions.create", 409);
    setInjectedFailure("submissions.create", null);
    expect(readInjectedFailure("submissions.create")).toBeNull();
    expect(sessionStorage.getItem(FAIL_STORAGE_KEY)).toBeNull();
  });

  it("손상된 저장 값은 조용히 무시한다", () => {
    sessionStorage.setItem(FAIL_STORAGE_KEY, "{broken json");
    expect(readInjectedFailure("submissions.create")).toBeNull();
  });

  it("mock repository가 주입된 오류를 실제로 던진다", async () => {
    setInjectedFailure("reviews.approve", 409);
    const repos = createMockRepositories();

    const error = await repos.reviews
      .approve({ submissionId: "notice-003", revision: 1 })
      .catch((cause) => cause);
    expect(isApiError(error)).toBe(true);
    expect(error.status).toBe(409);

    // 주입이 없는 요청은 정상 동작한다.
    const page = await repos.submissions.list({ limit: 1 });
    expect(page.items).toHaveLength(1);
  });

  it("withInjection이 함수가 아닌 속성을 보존한다", () => {
    const target = { value: 42, run: async () => "ok" };
    const wrapped = withInjection("test", target);
    expect(wrapped.value).toBe(42);
  });

  it("지연 주입 값이 검증된다", () => {
    setInjectedLatencyMs(3000);
    expect(sessionStorage.getItem(LATENCY_STORAGE_KEY)).toBe("3000");
    setInjectedLatencyMs(null);
    expect(sessionStorage.getItem(LATENCY_STORAGE_KEY)).toBeNull();
  });
});
