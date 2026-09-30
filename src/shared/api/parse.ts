import { ApiError } from "./error";

/**
 * 서버 응답 검증.
 *
 * 응답 타입은 OpenAPI에서 만들지만(`generated/schema.d.ts`) 실제 값이 그 모양이라는
 * 보장은 아니다. 화면이 쓰는 필드만 경계에서 확인해, 모양이 틀리면 화면 깊숙한 곳의
 * `undefined` 오류 대신 `parse` 오류(`INVALID_RESPONSE`)로 한 곳에서 멈춘다.
 * (Phase 08 "응답을 신뢰하지 않고 파싱 검증")
 *
 * 오류 message에는 필드 경로만 담고 값은 담지 않는다. 토큰 같은 값이 로그에 남지 않게.
 */
export type JsonObject = Record<string, unknown>;

export function invalidResponse(path: string, expected: string): ApiError {
  return new ApiError({
    kind: "parse",
    code: "INVALID_RESPONSE",
    message: `서버 응답 형식이 올바르지 않습니다: ${path}은(는) ${expected}이어야 합니다.`,
  });
}

export function readObject(value: unknown, path = "응답"): JsonObject {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw invalidResponse(path, "객체");
  }
  return value as JsonObject;
}

/** 배열 응답. 항목은 호출부가 하나씩 검증한다. */
export function readArray(value: unknown, path = "응답"): unknown[] {
  if (!Array.isArray(value)) throw invalidResponse(path, "배열");
  return value;
}

export function readString(
  object: JsonObject,
  key: string,
  path = key,
): string {
  const value = object[key];
  if (typeof value !== "string") throw invalidResponse(path, "문자열");
  return value;
}

export function readNullableString(
  object: JsonObject,
  key: string,
  path = key,
): string | null {
  const value = object[key];
  if (value === null || value === undefined) return null;
  if (typeof value !== "string")
    throw invalidResponse(path, "문자열 또는 null");
  return value;
}

export function readNumber(
  object: JsonObject,
  key: string,
  path = key,
): number {
  const value = object[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw invalidResponse(path, "숫자");
  }
  return value;
}

export function readBoolean(
  object: JsonObject,
  key: string,
  path = key,
): boolean {
  const value = object[key];
  if (typeof value !== "boolean")
    throw invalidResponse(path, "true 또는 false");
  return value;
}

export function readStringArray(
  object: JsonObject,
  key: string,
  path = key,
): string[] {
  const value = object[key];
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw invalidResponse(path, "문자열 배열");
  }
  return value as string[];
}

/** UTC ISO 8601 시각. offset이 없는 문자열은 받지 않는다(`API-REQUIREMENTS.md` 1.1). */
export function readIsoDate(object: JsonObject, key: string, path = key): Date {
  const value = readString(object, key, path);
  const date = new Date(value);
  if (!/(Z|[+-]\d{2}:\d{2})$/.test(value) || Number.isNaN(date.getTime())) {
    throw invalidResponse(path, "offset이 있는 ISO 8601 시각");
  }
  return date;
}
