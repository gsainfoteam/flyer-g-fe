/**
 * 표준 오류 모델 (명세 8.4)
 * - 안정적인 `code`, 사용자용 `message`, 추적용 `requestId`
 * - 내부 stack, token, request body는 UI로 넘기지 않는다. 명세 FR-PLY-06, 9.4
 */
export const API_ERROR_KINDS = [
  "network",
  "timeout",
  "canceled",
  "http",
  "parse",
  "unknown",
] as const;
export type ApiErrorKind = (typeof API_ERROR_KINDS)[number];

export interface ApiErrorBody {
  code: string;
  message: string;
  requestId: string | null;
}

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly code: string;
  readonly status: number | null;
  readonly requestId: string | null;

  constructor(init: {
    kind: ApiErrorKind;
    code: string;
    message: string;
    status?: number | null;
    requestId?: string | null;
  }) {
    super(init.message);
    this.name = "ApiError";
    this.kind = init.kind;
    this.code = init.code;
    this.status = init.status ?? null;
    this.requestId = init.requestId ?? null;
  }
}

export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError;
}

const STATUS_CODES: Record<number, string> = {
  400: "INVALID_REQUEST",
  401: "UNAUTHENTICATED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  409: "CONFLICT",
  413: "PAYLOAD_TOO_LARGE",
  422: "VALIDATION_FAILED",
  429: "RATE_LIMITED",
};

export function codeForStatus(status: number): string {
  if (STATUS_CODES[status]) return STATUS_CODES[status];
  return status >= 500 ? "SERVER_ERROR" : "HTTP_ERROR";
}

/** 무엇이 던져졌든 하나의 ApiError로 좁힌다. 원인 객체를 그대로 노출하지 않는다. */
export function normalizeApiError(cause: unknown): ApiError {
  if (isApiError(cause)) return cause;

  if (cause instanceof DOMException && cause.name === "AbortError") {
    return new ApiError({
      kind: "canceled",
      code: "REQUEST_CANCELED",
      message: "요청이 취소되었습니다.",
    });
  }

  if (cause instanceof TypeError) {
    return new ApiError({
      kind: "network",
      code: "NETWORK_ERROR",
      message: "네트워크에 연결할 수 없습니다.",
    });
  }

  return new ApiError({
    kind: "unknown",
    code: "UNKNOWN_ERROR",
    message: "알 수 없는 오류가 발생했습니다.",
  });
}

/**
 * 화면에 보여줄 문구. API 오류 모델과 UI 표시를 분리하기 위한 유일한 통로다.
 * 서버 message를 그대로 쓰지 않고 상황별 안내 문구를 우선한다.
 */
export function toUserMessage(error: ApiError): string {
  switch (error.code) {
    case "UNAUTHENTICATED":
      return "로그인이 필요합니다. 다시 로그인해 주세요.";
    case "FORBIDDEN":
      return "이 작업을 수행할 권한이 없습니다.";
    case "NOT_FOUND":
      return "요청한 내용을 찾을 수 없습니다.";
    case "CONFLICT":
      return "다른 사용자가 먼저 처리했습니다. 최신 상태를 다시 불러와 주세요.";
    case "PAYLOAD_TOO_LARGE":
      return "파일 용량이 허용 범위를 넘었습니다.";
    case "RATE_LIMITED":
      return "요청이 많습니다. 잠시 후 다시 시도해 주세요.";
    case "NETWORK_ERROR":
      return "네트워크에 연결할 수 없습니다. 연결을 확인한 뒤 다시 시도해 주세요.";
    case "REQUEST_CANCELED":
      return "요청이 취소되었습니다.";
    default:
      return error.status !== null && error.status >= 500
        ? "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."
        : "요청을 처리하지 못했습니다.";
  }
}

/** 오류 보고용 추적 문구. requestId가 없으면 표시하지 않는다. 명세 8.4 */
export function toTraceLabel(error: ApiError): string | null {
  return error.requestId ? `요청 ID: ${error.requestId}` : null;
}
