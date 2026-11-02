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
  /**
   * 입력 필드별 오류. 서버 400/422 응답의 `fields`를 그대로 담는다.
   * (`API-REQUIREMENTS.md` 1.2) 있으면 화면이 해당 입력 칸에 오류를 붙인다.
   */
  fields?: Record<string, string>;
  /**
   * code별 부가 정보. 지금은 `DAILY_LIMIT_EXCEEDED`의 `{ type, limit }`뿐이다.
   * 모양은 code마다 다르므로 읽는 쪽이 확인한다.
   */
  details?: Record<string, unknown>;
}

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly code: string;
  readonly status: number | null;
  readonly requestId: string | null;
  /** 입력 필드별 오류. 없으면 null. */
  readonly fields: Record<string, string> | null;
  /** code별 부가 정보. 없으면 null. */
  readonly details: Record<string, unknown> | null;

  constructor(init: {
    kind: ApiErrorKind;
    code: string;
    message: string;
    status?: number | null;
    requestId?: string | null;
    fields?: Record<string, string> | null;
    details?: Record<string, unknown> | null;
  }) {
    super(init.message);
    this.name = "ApiError";
    this.kind = init.kind;
    this.code = init.code;
    this.status = init.status ?? null;
    this.requestId = init.requestId ?? null;
    this.fields = init.fields ?? null;
    this.details = init.details ?? null;
  }
}

/**
 * 하루 신청 한도를 넘었을 때(429 `DAILY_LIMIT_EXCEEDED`)의 종류와 한도.
 * 다른 오류거나 모양이 다르면 null이다.
 */
export function dailyLimitOf(
  error: ApiError,
): { type: string; limit: number } | null {
  if (error.code !== "DAILY_LIMIT_EXCEEDED" || !error.details) return null;
  const { type, limit } = error.details;
  return typeof type === "string" && typeof limit === "number"
    ? { type, limit }
    : null;
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

  // TypeError를 연결 문제로 보지 않는다. 연결 실패는 http-client가 fetch 자리에서
  // 직접 network로 만든다. 여기서 뭉뚱그리면 코드 버그가 "네트워크 오류"로 보인다.

  return new ApiError({
    kind: "unknown",
    code: "UNKNOWN_ERROR",
    message: "알 수 없는 오류가 발생했습니다.",
  });
}

/**
 * 다시 요청하면 결과가 달라질 수 있는 오류인가.
 *
 * 네트워크·5xx·408·429만 재시도한다. 401/403/404/409/422 같은 4xx는 다시 보내도
 * 같은 답이 오므로, 재시도하면 오류 표시만 늦어진다. 취소는 사용자가 원한 것이다.
 * 429 중 하루 한도 초과는 다음 날까지 같은 답이라 재시도하지 않는다.
 */
export function isRetryableError(error: unknown): boolean {
  const apiError = normalizeApiError(error);
  if (apiError.kind === "canceled") return false;
  if (apiError.code === "DAILY_LIMIT_EXCEEDED") return false;
  if (apiError.status === null) return apiError.kind !== "parse";
  return (
    apiError.status >= 500 || apiError.status === 408 || apiError.status === 429
  );
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
    case "ALREADY_SUBMITTED":
      return "이 공지로 진행 중인 신청이 이미 있어요. 내 신청에서 확인해 주세요.";
    case "PAYLOAD_TOO_LARGE":
      return "파일 용량이 허용 범위를 넘었습니다.";
    case "RATE_LIMITED":
      return "요청이 많습니다. 잠시 후 다시 시도해 주세요.";
    case "DAILY_LIMIT_EXCEEDED": {
      const limit = dailyLimitOf(error)?.limit;
      return limit !== undefined
        ? `이 종류는 하루에 ${limit}건까지 올릴 수 있어요. 내일 다시 올려 주세요.`
        : "오늘 올릴 수 있는 수를 다 썼어요. 내일 다시 올려 주세요.";
    }
    case "NOT_RESUBMITTABLE":
      return "반려되거나 중단된 제보는 고쳐서 다시 낼 수 없어요. 새로 써 주세요.";
    case "NETWORK_ERROR":
      return "네트워크에 연결할 수 없습니다. 연결을 확인한 뒤 다시 시도해 주세요.";
    case "TIMEOUT":
      return "서버가 응답하지 않아요. 잠시 후 다시 시도해 주세요.";
    case "REQUEST_CANCELED":
      return "요청이 취소되었습니다.";
    case "AUTH_DENIED":
      return "로그인을 취소했어요. 다시 로그인해 주세요.";
    case "AUTH_STATE_MISMATCH":
      return "로그인 요청이 만료되었거나 다른 창에서 시작되었어요. 다시 로그인해 주세요.";
    case "AUTH_REDIRECT_MISMATCH":
      return "로그인 설정이 이 주소와 맞지 않아요. 관리자에게 문의해 주세요.";
    case "AUTH_FAILED":
      return "로그인을 마치지 못했어요. 다시 로그인해 주세요.";
    case "DEVICE_NOT_REGISTERED":
      return "관리자에게 받은 설정 링크로 이 화면을 열어 주세요.";
    case "DEVICE_UNAUTHORIZED":
      return "토큰이 재발급되었거나 사용하지 않는 기기예요. 관리자에게 새 설정 링크를 받아 주세요.";
    case "KV_NOT_BOUND":
      return "TV 설정 저장소(Cloudflare KV)가 아직 연결되지 않았어요. 관리자에게 문의해 주세요.";
    case "UPLOAD_FAILED":
      return "포스터를 올리지 못했습니다. 다시 시도해 주세요.";
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
