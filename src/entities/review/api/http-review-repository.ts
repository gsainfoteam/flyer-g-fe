import {
  parseSubmission,
  parseSubmissionPage,
} from "@/entities/submission/api/http-submission-repository";
import type { ApiRequestBody } from "@/shared/api/contract";
import type { HttpClient } from "@/shared/api/http-client";
import {
  invalidResponse,
  readArray,
  readIsoDate,
  readNullableString,
  readNumber,
  readObject,
  readString,
} from "@/shared/api/parse";
import type { JsonObject } from "@/shared/api/parse";
import type { ReviewRepository } from "@/shared/api/repositories";
import { ApiError } from "@/shared/api/error";
import { REJECTION_REASON_CODES } from "../model/types";
import type {
  DecisionRecord,
  RejectionReasonCode,
  ReviewDecision,
  SubmissionEvent,
  SubmissionEventType,
} from "../model/types";

/**
 * 검토와 처리 이력의 실제 구현 (`API-CHANGES-BACKEND.md` 6절, 11.2).
 *
 * | 메서드 | 경로 |
 * |---|---|
 * | listPending | `GET /signage/reviews?status=PENDING_REVIEW&categoryId=&cursor=&limit=` |
 * | approve | `POST /signage/submissions/{id}/approve` (`{ revision }`, Idempotency-Key) |
 * | reject | `POST /signage/submissions/{id}/reject` (`{ revision, reasonCode, comment }`, Idempotency-Key) |
 * | suspend | `POST /signage/submissions/{id}/suspend` (`{ reason }`, Idempotency-Key) |
 * | listHistory | `GET /signage/submissions/{id}/reviews` + `GET /signage/audit-logs` |
 * | listRecentDecisions | `GET /signage/audit-logs?targetType=SUBMISSION` (검토자) |
 *
 * 처리 이력은 두 API를 합친다(`API-FOLLOWUP-2026-09.md` 3절). 검토 결정(승인·반려·
 * 중단)은 사유 코드와 게시자에게 공개되는 의견이 있는 `/reviews`에서, 게시자 행동
 * (신청·재신청·취소)은 `/audit-logs`에서 가져온다.
 */

/** 감사 로그를 한 번에 받는 수. 서버 최대값이다. */
const AUDIT_PAGE_LIMIT = 100;
/** 신청 하나의 로그가 이보다 길 일은 없다. 끝없이 따라가지 않게 막는다. */
const AUDIT_MAX_PAGES = 10;

const DECISIONS = ["APPROVED", "REJECTED", "SUSPENDED"] as const;

function parseReview(payload: unknown, index: number): SubmissionEvent {
  const path = `[${index}]`;
  const body = readObject(payload, path);
  const decision = readString(body, "decision", `${path}.decision`);
  if (!(DECISIONS as readonly string[]).includes(decision)) {
    throw invalidResponse(`${path}.decision`, DECISIONS.join(" | "));
  }
  const reasonCode = readNullableString(
    body,
    "reasonCode",
    `${path}.reasonCode`,
  );
  return {
    id: readString(body, "id", `${path}.id`),
    submissionId: readString(body, "submissionId", `${path}.submissionId`),
    revision: readNumber(body, "revision", `${path}.revision`),
    type: decision as SubmissionEventType,
    reasonCode:
      reasonCode &&
      (REJECTION_REASON_CODES as readonly string[]).includes(reasonCode)
        ? (reasonCode as RejectionReasonCode)
        : null,
    comment: readNullableString(body, "comment", `${path}.comment`),
    actorId: readString(body, "reviewerId", `${path}.reviewerId`),
    actorName: readString(body, "reviewerName", `${path}.reviewerName`),
    occurredAt: readIsoDate(body, "reviewedAt", `${path}.reviewedAt`),
  };
}

/**
 * 감사 로그 한 줄을 게시자 행동으로. 검토 결정과 시스템 전이는 여기서 뺀다.
 *
 * - `SUBMISSION_CREATED` → 신청 (만들면 바로 검토 대기다)
 * - `SUBMISSION_RESUBMITTED` → 다시 신청 (반려 뒤 재검토 요청)
 * - `SUBMISSION_UPDATED` 중 승인 건이 검토 대기로 돌아간 것 → 다시 신청 (재승인)
 * - `SUBMISSION_CANCELED` → 신청 취소
 * - `SUBMISSION_PUBLISHED`·`_ENDED` → 게시 시작·종료 (서버 주기 작업, `actorType: SYSTEM`)
 */
function auditTypeOf(
  action: string,
  metadata: JsonObject | null,
): SubmissionEventType | null {
  switch (action) {
    case "SUBMISSION_CREATED":
      return "SUBMITTED";
    case "SUBMISSION_RESUBMITTED":
      return "RESUBMITTED";
    case "SUBMISSION_CANCELED":
      return "CANCELED";
    case "SUBMISSION_PUBLISHED":
      return "PUBLISHED";
    case "SUBMISSION_ENDED":
      return "ENDED";
    case "SUBMISSION_UPDATED":
      return metadata?.toStatus === "PENDING_REVIEW" &&
        metadata.fromStatus !== "PENDING_REVIEW"
        ? "RESUBMITTED"
        : null;
    default:
      return null;
  }
}

function parseAuditEvent(
  payload: unknown,
  index: number,
  submissionId: string,
): SubmissionEvent | null {
  const path = `items[${index}]`;
  const body = readObject(payload, path);
  const metadata =
    typeof body.metadata === "object" && body.metadata !== null
      ? (body.metadata as JsonObject)
      : null;
  const type = auditTypeOf(
    readString(body, "action", `${path}.action`),
    metadata,
  );
  if (type === null) return null;
  const bySystem = body.actorType === "SYSTEM";
  return {
    id: readString(body, "id", `${path}.id`),
    submissionId,
    revision: typeof metadata?.revision === "number" ? metadata.revision : null,
    type,
    reasonCode: null,
    comment: null,
    actorId: bySystem
      ? ""
      : (readNullableString(body, "actorId", `${path}.actorId`) ?? ""),
    // 서버 작업은 사람이 아니다. 탈퇴한 사용자는 이름이 없다.
    actorName: bySystem
      ? ""
      : (readNullableString(body, "actorName", `${path}.actorName`) ??
        "알 수 없음"),
    occurredAt: readIsoDate(body, "createdAt", `${path}.createdAt`),
  };
}

const DECISION_BY_ACTION: Record<string, ReviewDecision> = {
  SUBMISSION_APPROVED: "APPROVED",
  SUBMISSION_REJECTED: "REJECTED",
  SUBMISSION_SUSPENDED: "SUSPENDED",
};

/**
 * 최근 처리 기록을 찾으려고 한 번에 받는 로그 수. 서버 최대값이다.
 *
 * 지금 `action`은 값 하나만 받아서 결정(승인·반려·중단)만 골라 받을 수 없다. 한
 * 페이지를 받아 여기서 거른다. 백엔드가 여러 값을 받게 되면
 * (`API-FOLLOWUP-2026-09-30.md` 1-3) `action`으로 거르고 `limit`만큼만 받는다.
 */
const DECISION_SCAN_LIMIT = 100;

function parseDecisionLog(
  payload: unknown,
  index: number,
): (DecisionRecord & { needsTitle: boolean }) | null {
  const path = `items[${index}]`;
  const body = readObject(payload, path);
  const decision =
    DECISION_BY_ACTION[readString(body, "action", `${path}.action`)];
  if (!decision || body.targetType !== "SUBMISSION") return null;
  // 대상 제목은 백엔드가 곧 넣어 준다(1-2). 없으면 신청을 따로 불러 채운다.
  const hasTitle = typeof body.targetTitle === "string";
  return {
    id: readString(body, "id", `${path}.id`),
    submissionId: readString(body, "targetId", `${path}.targetId`),
    submissionTitle: hasTitle ? (body.targetTitle as string) : null,
    needsTitle: !hasTitle && body.targetTitle !== null,
    decision,
    actorName:
      readNullableString(body, "actorName", `${path}.actorName`) ??
      "알 수 없음",
    occurredAt: readIsoDate(body, "createdAt", `${path}.createdAt`),
  };
}

const submissionPath = (id: string) =>
  `/signage/submissions/${encodeURIComponent(id)}`;

export function createHttpReviewRepository(
  client: HttpClient,
): ReviewRepository {
  /** 신청 하나의 감사 로그를 모두 받는다. 최신순으로 오니 다 받은 뒤 정렬한다. */
  const listAuditEvents = async (
    submissionId: string,
    signal?: AbortSignal,
  ): Promise<SubmissionEvent[]> => {
    const events: SubmissionEvent[] = [];
    let cursor: string | null = null;
    for (let page = 0; page < AUDIT_MAX_PAGES; page += 1) {
      const body = readObject(
        await client.request({
          path: "/signage/audit-logs",
          query: {
            targetType: "SUBMISSION",
            targetId: submissionId,
            limit: AUDIT_PAGE_LIMIT,
            cursor,
          },
          signal,
        }),
      );
      readArray(body.items, "items").forEach((item, index) => {
        const event = parseAuditEvent(item, index, submissionId);
        if (event) events.push(event);
      });
      cursor = readNullableString(body, "nextCursor");
      if (cursor === null) break;
    }
    return events;
  };

  return {
    async listPending(params, signal) {
      return parseSubmissionPage(
        await client.request({
          path: "/signage/reviews",
          query: {
            status: "PENDING_REVIEW",
            categoryId: params.categoryId,
            cursor: params.cursor,
            limit: params.limit,
          },
          signal,
        }),
      );
    },

    async listHistory(submissionId, signal) {
      const [reviews, audits] = await Promise.all([
        client.request({
          path: `${submissionPath(submissionId)}/reviews`,
          signal,
        }),
        listAuditEvents(submissionId, signal),
      ]);
      const decisions = readArray(reviews).map(parseReview);
      return [...audits, ...decisions].sort(
        (a, b) => a.occurredAt.getTime() - b.occurredAt.getTime(),
      );
    },

    async listRecentDecisions({ limit }, signal) {
      const body = readObject(
        await client.request({
          path: "/signage/audit-logs",
          query: { targetType: "SUBMISSION", limit: DECISION_SCAN_LIMIT },
          signal,
        }),
      );
      const records = readArray(body.items, "items")
        .map(parseDecisionLog)
        .filter((record) => record !== null)
        .slice(0, limit);
      return Promise.all(
        records.map(async ({ needsTitle, ...record }) => {
          if (!needsTitle) return record;
          try {
            const submission = parseSubmission(
              await client.request({
                path: submissionPath(record.submissionId),
                signal,
              }),
            );
            return { ...record, submissionTitle: submission.title };
          } catch (error) {
            // 지워진 신청은 제목 없이 둔다. 나머지 오류는 그대로 알린다.
            if (error instanceof ApiError && error.status === 404) {
              return record;
            }
            throw error;
          }
        }),
      );
    },

    async approve({ submissionId, revision }, options) {
      return parseSubmission(
        await client.request({
          method: "POST",
          path: `${submissionPath(submissionId)}/approve`,
          body: { revision } satisfies ApiRequestBody<"ApproveSubmissionDto">,
          idempotencyKey: options?.idempotencyKey,
          signal: options?.signal,
        }),
      );
    },

    async reject({ submissionId, revision, reasonCode, comment }, options) {
      return parseSubmission(
        await client.request({
          method: "POST",
          path: `${submissionPath(submissionId)}/reject`,
          body: {
            revision,
            reasonCode,
            comment,
          } satisfies ApiRequestBody<"RejectSubmissionDto">,
          idempotencyKey: options?.idempotencyKey,
          signal: options?.signal,
        }),
      );
    },

    async suspend({ submissionId, reason }, options) {
      return parseSubmission(
        await client.request({
          method: "POST",
          path: `${submissionPath(submissionId)}/suspend`,
          body: { reason } satisfies ApiRequestBody<"SuspendSubmissionDto">,
          idempotencyKey: options?.idempotencyKey,
          signal: options?.signal,
        }),
      );
    },
  };
}
