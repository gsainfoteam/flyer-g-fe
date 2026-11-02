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
  CreateEventBannerInput,
  CreateStoryInput,
  CreateSubmissionInput,
  SubmissionRepository,
  UpdateSubmissionInput,
} from "@/shared/api/repositories";
import { toIsoUtc } from "@/shared/lib/datetime";
import { SUBMISSION_KINDS } from "../model/kind";
import type { SubmissionKind } from "../model/kind";
import {
  EVENT_BANNER_MODES,
  EVENT_BANNER_OCCASIONS,
  POSTER_KINDS,
  STORY_TAGS,
  SUBMISSION_DECISIONS,
  SUBMISSION_STATUSES,
} from "../model/types";
import type {
  EventBanner,
  KindQueueSummary,
  Page,
  Story,
  SignageSubmissionExpanded,
  SubmissionListParams,
  SubmissionDecision,
  SubmissionStatus,
  SubmissionSummary,
} from "../model/types";

/**
 * 게시 신청의 실제 구현 (`API-CHANGES-BACKEND.md` 5절, 7.1).
 *
 * | 메서드 | 경로 |
 * |---|---|
 * | list | `GET /signage/submissions?scope=&statuses=&type=&cursor=&limit=` |
 * | getById | `GET /signage/submissions/{id}` |
 * | getSummary | `GET /signage/submissions/summary?scope=` |
 * | create | `POST /signage/submissions` (Idempotency-Key) |
 * | update | `PATCH /signage/submissions/{id}` |
 * | submit | `POST /signage/submissions/{id}/submit` (Idempotency-Key) |
 * | cancel | `POST /signage/submissions/{id}/cancel` (Idempotency-Key) |
 * | revealAuthor | `POST /signage/submissions/{id}/reveal-author` (SUPER_ADMIN) |
 * | listRecentStories | `GET /signage/stories/recent?limit=` |
 *
 * 응답은 화면이 쓰는 필드를 검증해 도메인 모델로 옮긴다. 승인 대기 목록(8.5)도 같은
 * 신청 객체를 주므로 파싱 함수를 함께 쓴다.
 */

/**
 * 가장 최근 검토 결정. 백엔드가 아직 주지 않는 동안은 null로 읽는다
 * (`API-FOLLOWUP-2026-09-30.md` 1-1). 값이 오면 알려진 값만 받는다.
 */
function readDecision(
  object: JsonObject,
  path: string,
): SubmissionDecision | null {
  const value = object.lastDecision;
  if (value === null || value === undefined) return null;
  if (
    typeof value !== "string" ||
    !(SUBMISSION_DECISIONS as readonly string[]).includes(value)
  ) {
    throw invalidResponse(
      path,
      `${SUBMISSION_DECISIONS.join(" | ")} 또는 null`,
    );
  }
  return value as SubmissionDecision;
}

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

function readNullableEnum<T extends string>(
  object: JsonObject,
  key: string,
  allowed: readonly T[],
  path: string,
): T | null {
  return object[key] === null || object[key] === undefined
    ? null
    : readEnum(object, key, allowed, path);
}

function readNullableNumber(
  object: JsonObject,
  key: string,
  path: string,
): number | null {
  return object[key] === null || object[key] === undefined
    ? null
    : readNumber(object, key, path);
}

/** 종류별 내용 객체. 그 종류가 아니면 null이고, 키가 없던 옛 응답도 null로 읽는다. */
function readNullableObject(
  object: JsonObject,
  key: string,
  path: string,
): JsonObject | null {
  return object[key] === null || object[key] === undefined
    ? null
    : readObject(object[key], path);
}

function parseEventBanner(body: JsonObject, path: string): EventBanner {
  const at = (key: string) => `${path}.${key}`;
  return {
    mode: readEnum(body, "mode", EVENT_BANNER_MODES, at("mode")),
    occasion: readNullableEnum(
      body,
      "occasion",
      EVENT_BANNER_OCCASIONS,
      at("occasion"),
    ),
    recipient: readString(body, "recipient", at("recipient")),
    message: readNullableString(body, "message", at("message")),
    sender: readNullableString(body, "sender", at("sender")),
    photoAssetId: readNullableString(body, "photoAssetId", at("photoAssetId")),
    photoUrl: readNullableString(body, "photoUrl", at("photoUrl")),
    photoConsent: body.photoConsent === true,
    assetId: readNullableString(body, "assetId", at("assetId")),
    assetUrl: readNullableString(body, "assetUrl", at("assetUrl")),
  };
}

function parseStory(body: JsonObject, path: string): Story {
  return {
    tag: readEnum(body, "tag", STORY_TAGS, `${path}.tag`),
    body: readString(body, "body", `${path}.body`),
    storyNumber: readNullableNumber(body, "storyNumber", `${path}.storyNumber`),
  };
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
    // 제보는 작성자 본인이 아니면(검토자 포함) 신청자가 null이다.
    requesterId: readNullableString(body, "requesterId", at("requesterId")),
    requesterName: readNullableString(
      body,
      "requesterName",
      at("requesterName"),
    ),
    type: readEnum<SubmissionKind>(body, "type", SUBMISSION_KINDS, at("type")),
    title: readString(body, "title", at("title")),
    // 포스터 전용 필드. 다른 종류는 null이다.
    categoryId: readNullableString(body, "categoryId", at("categoryId")),
    categoryName: readNullableString(body, "categoryName", at("categoryName")),
    assetId: readNullableString(body, "assetId", at("assetId")),
    posterUrl: readNullableString(body, "posterUrl", at("posterUrl")),
    posterThumbUrl: readNullableString(
      body,
      "posterThumbUrl",
      at("posterThumbUrl"),
    ),
    posterWidth: readNullableNumber(body, "posterWidth", at("posterWidth")),
    posterHeight: readNullableNumber(body, "posterHeight", at("posterHeight")),
    posterKind: readNullableEnum(
      body,
      "posterKind",
      POSTER_KINDS,
      at("posterKind"),
    ),
    posterDurationMs: readNullableNumber(
      body,
      "posterDurationMs",
      at("posterDurationMs"),
    ),
    posterVideoUrl: readNullableString(
      body,
      "posterVideoUrl",
      at("posterVideoUrl"),
    ),
    detailUrl: readNullableString(body, "detailUrl", at("detailUrl")),
    // 승인 전 제보는 기간이 없다.
    startAt: readNullableIsoDate(body, "startAt", at("startAt")),
    endAt: readNullableIsoDate(body, "endAt", at("endAt")),
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
    lastDecision: readDecision(body, at("lastDecision")),
    eventBanner: (() => {
      const banner = readNullableObject(body, "eventBanner", at("eventBanner"));
      return banner && parseEventBanner(banner, at("eventBanner"));
    })(),
    story: (() => {
      const story = readNullableObject(body, "story", at("story"));
      return story && parseStory(story, at("story"));
    })(),
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
  const pendingReview = readNumber(body, "pendingReview");
  return {
    calculatedAt: readIsoDate(body, "calculatedAt"),
    total: readNumber(body, "total"),
    published: readNumber(body, "published"),
    scheduled: readNumber(body, "scheduled"),
    pendingReview,
    ended: readNumber(body, "ended"),
    byStatus,
    byType: parseByType(body.byType, pendingReview),
  };
}

/**
 * 종류별 검토 대기(배포 ②). 서버는 모든 종류를 항상 준다. ②가 나가기 전 서버는
 * `byType`이 없으므로, 그때는 대기 전체를 포스터로 본다.
 */
function parseByType(
  payload: unknown,
  pendingReview: number,
): Record<SubmissionKind, KindQueueSummary> {
  if (payload === undefined || payload === null) {
    return Object.fromEntries(
      SUBMISSION_KINDS.map((kind) => [
        kind,
        {
          pendingReview: kind === "POSTER" ? pendingReview : 0,
          oldestSubmittedAt: null,
        },
      ]),
    ) as Record<SubmissionKind, KindQueueSummary>;
  }
  const byType = readObject(payload, "byType");
  return Object.fromEntries(
    SUBMISSION_KINDS.map((kind) => {
      const entry = readObject(byType[kind], `byType.${kind}`);
      return [
        kind,
        {
          pendingReview: readNumber(
            entry,
            "pendingReview",
            `byType.${kind}.pendingReview`,
          ),
          oldestSubmittedAt: readNullableIsoDate(
            entry,
            "oldestSubmittedAt",
            `byType.${kind}.oldestSubmittedAt`,
          ),
        },
      ];
    }),
  ) as Record<SubmissionKind, KindQueueSummary>;
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

/** 종류 필터를 서버의 `type`(쉼표 구분)으로. 비우면 모든 종류다. */
export function typesOf(
  types: readonly SubmissionKind[] | undefined,
): string | undefined {
  return types && types.length > 0 ? types.join(",") : undefined;
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

/**
 * 이벤트 배너·제보 생성 본문. 생성된 계약 타입은 배포 ③④ 전 문서라 종류 필드가 없다.
 * `bun run api:sync` 뒤에는 캐스트 없이 `CreateSubmissionDto`에 맞는다.
 */
function toCreateContentBody(
  input: CreateEventBannerInput | CreateStoryInput,
): ApiRequestBody<"CreateSubmissionDto"> {
  const body =
    input.type === "STORY"
      ? { type: input.type, story: input.story }
      : {
          type: input.type,
          eventBanner: input.eventBanner,
          startAt: toIsoUtc(input.startAt),
          endAt: toIsoUtc(input.endAt),
          targetGroupIds: input.targetGroupIds,
        };
  return body as unknown as ApiRequestBody<"CreateSubmissionDto">;
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
            type: typesOf(params.types),
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

    async createContent(input, options) {
      return parseSubmission(
        await client.request({
          method: "POST",
          path: "/signage/submissions",
          body: toCreateContentBody(input),
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

    async revealAuthor(id, signal) {
      const body = readObject(
        await client.request({
          method: "POST",
          path: `${submissionPath(id)}/reveal-author`,
          signal,
        }),
        "작성자",
      );
      return {
        requesterId: readString(body, "requesterId", "작성자.requesterId"),
        requesterName: readString(body, "requesterName", "작성자.requesterName"),
        requesterEmail: readString(
          body,
          "requesterEmail",
          "작성자.requesterEmail",
        ),
      };
    },

    async listRecentStories({ limit }, signal) {
      const body = readObject(
        await client.request({
          path: "/signage/stories/recent",
          query: { limit },
          signal,
        }),
      );
      return readArray(body.items, "items").map((item, index) => {
        const path = `items[${index}]`;
        const story = readObject(item, path);
        return {
          storyNumber: readNumber(story, "storyNumber", `${path}.storyNumber`),
          tag: readEnum(story, "tag", STORY_TAGS, `${path}.tag`),
          body: readString(story, "body", `${path}.body`),
          startAt: readIsoDate(story, "startAt", `${path}.startAt`),
        };
      });
    },
  };
}
