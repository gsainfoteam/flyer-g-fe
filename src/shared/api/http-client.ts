import { ApiError, codeForStatus, normalizeApiError } from "./error";
import type { ApiErrorBody } from "./error";

/**
 * 공통 transport. 화면 컴포넌트는 이 계층을 직접 쓰지 않고 repository를 통해 접근한다.
 *
 * 경로는 호출자가 넘긴다. 명세 8장의 개념 endpoint는 아직 확정 계약이 아니므로
 * 이 파일에 실제 경로를 상수로 고정하지 않는다. 실제 연결은 Phase 08에서 한다.
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
}

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

function readErrorBody(payload: unknown): Partial<ApiErrorBody> {
  if (typeof payload !== "object" || payload === null) return {};
  const record = payload as Record<string, unknown>;
  return {
    code: typeof record.code === "string" ? record.code : undefined,
    message: typeof record.message === "string" ? record.message : undefined,
    requestId:
      typeof record.requestId === "string" ? record.requestId : undefined,
  };
}

export function createHttpClient(options: HttpClientOptions): HttpClient {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;

  return {
    async request<T>(request: HttpRequest): Promise<T> {
      const method = request.method ?? "GET";
      const headers: Record<string, string> = {
        Accept: "application/json",
        ...(await options.getAuthHeaders?.()),
      };
      if (request.body !== undefined) {
        headers["Content-Type"] = "application/json";
      }
      if (request.idempotencyKey) {
        headers["Idempotency-Key"] = request.idempotencyKey;
      }

      let response: Response;
      try {
        response = await fetchImpl(
          buildUrl(options.baseUrl, request.path, request.query),
          {
            method,
            headers,
            signal: request.signal,
            body:
              request.body === undefined
                ? undefined
                : JSON.stringify(request.body),
          },
        );
      } catch (cause) {
        throw normalizeApiError(cause);
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
