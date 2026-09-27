import type { HttpClient } from "@/shared/api/http-client";
import type { ApiRequestBody } from "@/shared/api/contract";
import {
  invalidResponse,
  readArray,
  readIsoDate,
  readNullableString,
  readNumber,
  readObject,
  readString,
  readStringArray,
} from "@/shared/api/parse";
import type { JsonObject } from "@/shared/api/parse";
import type {
  CreateSubmissionInput,
  SubmissionRepository,
  UpdateSubmissionInput,
} from "@/shared/api/repositories";
import { toIsoUtc } from "@/shared/lib/datetime";
import { CONTENT_TYPES, SUBMISSION_STATUSES } from "../model/types";
import type {
  ContentType,
  Page,
  SignageSubmissionExpanded,
  SubmissionListParams,
  SubmissionStatus,
  SubmissionSummary,
} from "../model/types";

/**
 * 게시 신청의 실제 구현 (`API-CHANGES-BACKEND.md` 5절, 7.1).
 *
 * | 메서드 | 경로 |
 * |---|---|
 * | list | `GET /signage/submissions?scope=&statuses=&cursor=&limit=` |
 * | getById | `GET /signage/submissions/{id}` |
 * | getSummary | `GET /signage/submissions/summary?scope=` |
 * | create | `POST /signage/submissions` (Idempotency-Key) |
 * | update | `PATCH /signage/submissions/{id}` |
 * | submit | `POST /signage/submissions/{id}/submit` (Idempotency-Key) |
 * | cancel | `POST /signage/submissions/{id}/cancel` (Idempotency-Key) |
 *
 * 응답은 화면이 쓰는 필드를 검증해 도메인 모델로 옮긴다. 승인 대기 목록(8.5)도 같은
 * 신청 객체를 주므로 파싱 함수를 함께 쓴다.
 */

function readEnum<T extends string>(
  object: JsonObject,
  key: string,
  allowed: readonly T[],
  path: string,
): T {
  const value = readString(object, key, path);
  if (!(allowed as readonly string[]).includes(value)) {
    throw invalidResponse(path, allowed.join(" | "));
  }
  return value as T;
}

function readNullableIsoDate(
  object: JsonObject,
  key: string,
  path: string,
): Date | null {
  return object[key] === null || object[key] === undefined
    ? null
    : readIsoDate(object, key, path);
}

/** 신청 객체 하나. `path`는 오류에 어느 항목인지 적기 위한 것이다. */
export function parseSubmission(
  payload: unknown,
  path = "신청",
): SignageSubmissionExpanded {
  const body = readObject(payload, path);
  const at = (key: string) => `${path}.${key}`;
  return {
    id: readString(body, "id", at("id")),
    ziggleNoticeId: readNullableString(
      body,
      "ziggleNoticeId",
      at("ziggleNoticeId"),
    ),
    requesterId: readString(body, "requesterId", at("requesterId")),
    requesterName: readString(body, "requesterName", at("requesterName")),
    type: readEnum<ContentType>(body, "type", CONTENT_TYPES, at("type")),
    title: readString(body, "title", at("title")),
    categoryId: readString(body, "categoryId", at("categoryId")),
    categoryName: readString(body, "categoryName", at("categoryName")),
    assetId: readString(body, "assetId", at("assetId")),
    posterUrl: readString(body, "posterUrl", at("posterUrl")),
    posterThumbUrl: readString(body, "posterThumbUrl", at("posterThumbUrl")),
    detailUrl: readNullableString(body, "detailUrl", at("detailUrl")),
    startAt: readIsoDate(body, "startAt", at("startAt")),
    endAt: readIsoDate(body, "endAt", at("endAt")),
    status: readEnum<SubmissionStatus>(
      body,
      "status",
      SUBMISSION_STATUSES,
      at("status"),
    ),
    priority: readNumber(body, "priority", at("priority")),
    targetGroupIds: readStringArray(
      body,
      "targetGroupIds",
      at("targetGroupIds"),
    ),
    organizerName: readNullableString(
      body,
      "organizerName",
      at("organizerName"),
    ),
    subtitle: readNullableString(body, "subtitle", at("subtitle")),
    location: readNullableString(body, "location", at("location")),
    description: readNullableString(body, "description", at("description")),
    version: readNumber(body, "version", at("version")),
    submittedAt: readNullableIsoDate(body, "submittedAt", at("submittedAt")),
    createdAt: readIsoDate(body, "createdAt", at("createdAt")),
    updatedAt: readIsoDate(body, "updatedAt", at("updatedAt")),
  };
}

/** 목록 봉투 (`API-REQUIREMENTS.md` 1.1) */
export function parseSubmissionPage(
  payload: unknown,
): Page<SignageSubmissionExpanded> {
  const body = readObject(payload);
  return {
    items: readArray(body.items, "items").map((item, index) =>
      parseSubmission(item, `items[${index}]`),
    ),
    nextCursor: readNullableString(body, "nextCursor"),
    totalCount: readNumber(body, "totalCount"),
    serverTime: readIsoDate(body, "serverTime"),
  };
}

export function parseSubmissionSummary(payload: unknown): SubmissionSummary {
  const body = readObject(payload);
  const counts = readObject(body.byStatus, "byStatus");
  const byStatus = Object.fromEntries(
    SUBMISSION_STATUSES.map((status) => [
      status,
      readNumber(counts, status, `byStatus.${status}`),
    ]),
  ) as Record<SubmissionStatus, number>;
  return {
    calculatedAt: readIsoDate(body, "calculatedAt"),
    total: readNumber(body, "total"),
    published: readNumber(body, "published"),
    scheduled: readNumber(body, "scheduled"),
    pendingReview: readNumber(body, "pendingReview"),
    ended: readNumber(body, "ended"),
    byStatus,
  };
}

/**
 * 상태 필터를 서버의 `statuses`(쉼표 구분)로. 화면은 상태 하나(`status`)나 여러 개
 * (`statuses`)로 부른다. 비우면 서버가 보관(ARCHIVED)을 뺀 전체를 준다.
 */
function statusesOf(params: SubmissionListParams): string | undefined {
  if (params.statuses && params.statuses.length > 0) {
    return params.statuses.join(",");
  }
  if (params.status && params.status !== "ALL") return params.status;
  return undefined;
}

/** 생성 본문. 날짜는 UTC ISO 문자열로 보낸다. */
function toCreateBody(
  input: CreateSubmissionInput,
): ApiRequestBody<"CreateSubmissionDto"> {
  return {
    ...input,
    startAt: toIsoUtc(input.startAt),
    endAt: toIsoUtc(input.endAt),
  };
}

/** 수정 본문. 보내지 않은 필드(undefined)는 JSON에서 빠져 서버가 그대로 둔다. */
function toUpdateBody(
  input: UpdateSubmissionInput,
): ApiRequestBody<"UpdateSubmissionDto"> {
  const { startAt, endAt, ...rest } = input;
  return {
    ...rest,
    startAt: startAt && toIsoUtc(startAt),
    endAt: endAt && toIsoUtc(endAt),
  };
}

const submissionPath = (id: string) =>
  `/signage/submissions/${encodeURIComponent(id)}`;

export function createHttpSubmissionRepository(
  client: HttpClient,
): SubmissionRepository {
  return {
    async list(params, signal) {
      return parseSubmissionPage(
        await client.request({
          path: "/signage/submissions",
          query: {
            scope: params.scope ?? "me",
            statuses: statusesOf(params),
            cursor: params.cursor,
            limit: params.limit,
          },
          signal,
        }),
      );
    },

    async getById(id, signal) {
      return parseSubmission(
        await client.request({ path: submissionPath(id), signal }),
      );
    },

    async getSummary(params, signal) {
      return parseSubmissionSummary(
        await client.request({
          path: "/signage/submissions/summary",
          query: { scope: params.scope ?? "me" },
          signal,
        }),
      );
    },

    async create(input, options) {
      return parseSubmission(
        await client.request({
          method: "POST",
          path: "/signage/submissions",
          body: toCreateBody(input),
          idempotencyKey: options?.idempotencyKey,
          signal: options?.signal,
        }),
      );
    },

    async update(id, input: UpdateSubmissionInput, options) {
      return parseSubmission(
        await client.request({
          method: "PATCH",
          path: submissionPath(id),
          body: toUpdateBody(input),
          signal: options?.signal,
        }),
      );
    },

    async submit(id, input, options) {
      return parseSubmission(
        await client.request({
          method: "POST",
          path: `${submissionPath(id)}/submit`,
          body: {
            version: input.version,
          } satisfies ApiRequestBody<"SubmissionVersionDto">,
          idempotencyKey: options?.idempotencyKey,
          signal: options?.signal,
        }),
      );
    },

    async cancel(id, input, options) {
      return parseSubmission(
        await client.request({
          method: "POST",
          path: `${submissionPath(id)}/cancel`,
          body: {
            version: input.version,
          } satisfies ApiRequestBody<"SubmissionVersionDto">,
          idempotencyKey: options?.idempotencyKey,
          signal: options?.signal,
        }),
      );
    },
  };
}
