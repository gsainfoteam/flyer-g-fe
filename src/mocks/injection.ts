import { ApiError, codeForStatus } from "@/shared/api/error";

/**
 * 개발 전용 mock 오류·지연 주입 (Phase 07 "mock 심화").
 *
 * 실서버 없이 401~5xx 오류 화면과 느린 네트워크를 재현한다. 컴포넌트 카탈로그의
 * Mock 제어 패널이나 브라우저 콘솔에서 켠다. sessionStorage에 저장되므로 탭을
 * 닫으면 사라지고, production 번들에서는 이 모듈을 참조하는 mock 자체가 빠진다.
 *
 * 사용 예 (콘솔):
 *   sessionStorage.setItem("flyerg:mock-fail", '{"submissions.create": 409}')
 *   sessionStorage.setItem("flyerg:mock-latency", "3000")
 */
export const FAIL_STORAGE_KEY = "flyerg:mock-fail";
export const LATENCY_STORAGE_KEY = "flyerg:mock-latency";

const FAILURE_MESSAGES: Record<number, string> = {
  401: "세션이 만료되었습니다.",
  403: "이 작업을 수행할 권한이 없습니다.",
  404: "요청한 내용을 찾을 수 없습니다.",
  409: "다른 사용자가 먼저 처리했습니다.",
  413: "파일 용량이 허용 범위를 넘었습니다.",
  422: "입력값 검증에 실패했습니다.",
  429: "요청이 너무 많습니다.",
  500: "서버 내부 오류가 발생했습니다.",
};

function safeSessionStorage(): Storage | null {
  try {
    return typeof sessionStorage !== "undefined" ? sessionStorage : null;
  } catch {
    return null;
  }
}

function readFailures(): Record<string, number> {
  const raw = safeSessionStorage()?.getItem(FAIL_STORAGE_KEY);
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, number] => typeof entry[1] === "number",
      ),
    );
  } catch {
    return {};
  }
}

/** 주입된 실패를 ApiError로 만든다. 없으면 null. `operation`은 "도메인.메서드". */
export function readInjectedFailure(operation: string): ApiError | null {
  const failures = readFailures();
  const status = failures[operation] ?? failures["*"];
  if (status === undefined) return null;

  return new ApiError({
    kind: "http",
    code: codeForStatus(status),
    message: FAILURE_MESSAGES[status] ?? `주입된 오류 (${status})`,
    status,
    requestId: `mock-injected-${operation}`,
    // 422는 필드 오류 형태까지 실서버 계약(1.2)과 같게 흉내 낸다.
    fields:
      status === 422
        ? { title: "제목을 다시 확인해 주세요. (주입된 오류)" }
        : null,
  });
}

export function readInjectedLatencyMs(): number {
  const raw = safeSessionStorage()?.getItem(LATENCY_STORAGE_KEY);
  const value = raw === null || raw === undefined ? NaN : Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

/** Mock 제어 패널용 쓰기 도우미 */
export function setInjectedFailure(operation: string, status: number | null): void {
  const storage = safeSessionStorage();
  if (!storage) return;
  const failures = readFailures();
  if (status === null) {
    delete failures[operation];
  } else {
    failures[operation] = status;
  }
  if (Object.keys(failures).length === 0) {
    storage.removeItem(FAIL_STORAGE_KEY);
  } else {
    storage.setItem(FAIL_STORAGE_KEY, JSON.stringify(failures));
  }
}

export function setInjectedLatencyMs(value: number | null): void {
  const storage = safeSessionStorage();
  if (!storage) return;
  if (value === null || value <= 0) {
    storage.removeItem(LATENCY_STORAGE_KEY);
  } else {
    storage.setItem(LATENCY_STORAGE_KEY, String(value));
  }
}

export function listInjectedFailures(): Record<string, number> {
  return readFailures();
}

/**
 * repository·adapter의 모든 메서드 앞에 주입 검사를 끼운다.
 * 메서드 이름이 그대로 operation 이름이 된다: `submissions.create` 등.
 */
export function withInjection<T extends object>(domain: string, target: T): T {
  const wrapped = {} as Record<string, unknown>;
  for (const key of Object.keys(target) as (keyof T & string)[]) {
    const original = target[key];
    if (typeof original !== "function") {
      wrapped[key] = original;
      continue;
    }
    wrapped[key] = async (...args: unknown[]) => {
      const latency = readInjectedLatencyMs();
      if (latency > 0) {
        await new Promise((resolve) => setTimeout(resolve, latency));
      }
      const failure = readInjectedFailure(`${domain}.${key}`);
      if (failure) throw failure;
      return (original as (...a: unknown[]) => unknown).apply(target, args);
    };
  }
  return wrapped as T;
}
