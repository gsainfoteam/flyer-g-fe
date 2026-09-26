import { ApiError, codeForStatus, normalizeApiError } from "./error";
import type { ApiErrorBody } from "./error";

/**
 * 공통 transport. 화면 컴포넌트는 이 계층을 직접 쓰지 않고 repository를 통해 접근한다.
 *
 * 경로는 호출자가 넘긴다. 명세 8장의 개념 endpoint는 아직 확정 계약이 아니므로
 * 이 파일에 실제 경로를 상수로 고정하지 않는다. 실제 연결은 Phase 08에서 한다.
 *
 * 실패는 모두 `ApiError`로 바꿔 던진다.
 * - 응답이 오지 않음(연결 실패) → `network`
 * - 제한 시간 초과 → `timeout`. 응답 없는 서버를 무한히 기다리면 화면이 로딩에 갇힌다.
 * - 호출자가 취소 → `canceled`
 * - 4xx/5xx → `http`. 서버의 `code`·`fields`(422 필드 오류)를 그대로 전달한다.
 */
export type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export type QueryValue = string | number | boolean | null | undefined;

export interface HttpRequest {
  method?: HttpMethod;
  path: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
  signal?: AbortSignal;
  /** 명세 8.4: 업로드와 제출은 idempotency를 지원한다. */
  idempotencyKey?: string;
}

export interface HttpClient {
  request<T>(request: HttpRequest): Promise<T>;
}

export interface HttpClientOptions {
  baseUrl: string;
  /** 인증 헤더 주입. Phase 01의 auth adapter가 채운다. */
  getAuthHeaders?: () => Promise<Record<string, string>>;
  fetchImpl?: typeof fetch;
  /** 요청 하나를 기다리는 최대 시간. 업로드처럼 긴 요청은 호출부가 늘린다. */
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 15_000;

const REQUEST_ID_HEADER = "x-request-id";

function buildUrl(
  baseUrl: string,
  path: string,
  query: Record<string, QueryValue> | undefined,
): string {
  const url = new URL(
    path.startsWith("/") ? path.slice(1) : path,
    `${baseUrl.replace(/\/+$/, "")}/`,
  );
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === null || value === undefined) continue;
    url.searchParams.set(key, String(value));
  }
  return url.toString();
}

function readFields(value: unknown): Record<string, string> | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const entries = Object.entries(value as Record<string, unknown>).filter(
    (entry): entry is [string, string] => typeof entry[1] === "string",
  );
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function readErrorBody(payload: unknown): Partial<ApiErrorBody> {
  if (typeof payload !== "object" || payload === null) return {};
  const record = payload as Record<string, unknown>;
  return {
    code: typeof record.code === "string" ? record.code : undefined,
    message: typeof record.message === "string" ? record.message : undefined,
    requestId:
      typeof record.requestId === "string" ? record.requestId : undefined,
    // 서버 422의 필드 오류. 폼이 입력 칸에 붙인다. (`API-REQUIREMENTS.md` 1.2)
    fields: readFields(record.fields),
  };
}

/**
 * 호출자의 취소와 제한 시간을 한 signal로 묶는다. 어느 쪽이 끊었는지 알아야
 * 오류를 구분할 수 있어 `timedOut()`을 함께 준다.
 */
function withTimeout(signal: AbortSignal | undefined, timeoutMs: number) {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const forward = () => controller.abort();
  if (signal?.aborted) controller.abort();
  else signal?.addEventListener("abort", forward, { once: true });

  return {
    signal: controller.signal,
    timedOut: () => timedOut,
    dispose: () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", forward);
    },
  };
}

export function createHttpClient(options: HttpClientOptions): HttpClient {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  return {
    async request<T>(request: HttpRequest): Promise<T> {
      const method = request.method ?? "GET";
      const headers: Record<string, string> = { Accept: "application/json" };
      try {
        Object.assign(headers, await options.getAuthHeaders?.());
      } catch (cause) {
        // 토큰을 준비하지 못했다. 원인 객체를 그대로 흘리지 않는다.
        throw normalizeApiError(cause);
      }
      if (request.body !== undefined) {
        headers["Content-Type"] = "application/json";
      }
      if (request.idempotencyKey) {
        headers["Idempotency-Key"] = request.idempotencyKey;
      }

      const deadline = withTimeout(request.signal, timeoutMs);
      let response: Response;
      try {
        response = await fetchImpl(
          buildUrl(options.baseUrl, request.path, request.query),
          {
            method,
            headers,
            signal: deadline.signal,
            body:
              request.body === undefined
                ? undefined
                : JSON.stringify(request.body),
          },
        );
      } catch (cause) {
        if (deadline.timedOut()) {
          throw new ApiError({
            kind: "timeout",
            code: "TIMEOUT",
            message: "서버가 제시간에 응답하지 않았습니다.",
          });
        }
        if (cause instanceof DOMException && cause.name === "AbortError") {
          throw normalizeApiError(cause);
        }
        // fetch가 응답 없이 실패한 경우만 연결 문제다. 다른 TypeError는 코드
        // 버그일 수 있어 여기서만 network로 분류한다.
        throw new ApiError({
          kind: "network",
          code: "NETWORK_ERROR",
          message: "네트워크에 연결할 수 없습니다.",
        });
      } finally {
        deadline.dispose();
      }

      const requestId = response.headers.get(REQUEST_ID_HEADER);

      if (!response.ok) {
        const body = readErrorBody(await response.json().catch(() => null));
        throw new ApiError({
          kind: "http",
          code: body.code ?? codeForStatus(response.status),
          message: body.message ?? `요청이 실패했습니다 (${response.status})`,
          status: response.status,
          requestId: body.requestId ?? requestId,
          fields: body.fields ?? null,
        });
      }

      if (response.status === 204) return undefined as T;

      try {
        return (await response.json()) as T;
      } catch {
        throw new ApiError({
          kind: "parse",
          code: "INVALID_RESPONSE",
          message: "서버 응답을 해석할 수 없습니다.",
          status: response.status,
          requestId,
        });
      }
    },
  };
}
