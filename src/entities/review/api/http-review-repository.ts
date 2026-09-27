import {
  parseSubmission,
  parseSubmissionPage,
} from "@/entities/submission/api/http-submission-repository";
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
import { REJECTION_REASON_CODES } from "../model/types";
import type {
  RejectionReasonCode,
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
  return {
    id: readString(body, "id", `${path}.id`),
    submissionId,
    revision: typeof metadata?.revision === "number" ? metadata.revision : null,
    type,
    reasonCode: null,
    comment: null,
    actorId: readNullableString(body, "actorId", `${path}.actorId`) ?? "",
    // 탈퇴한 사용자는 이름이 없다.
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

    async approve({ submissionId, revision }, options) {
      return parseSubmission(
        await client.request({
          method: "POST",
          path: `${submissionPath(submissionId)}/approve`,
          body: { revision },
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
          body: { revision, reasonCode, comment },
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
          body: { reason },
          idempotencyKey: options?.idempotencyKey,
          signal: options?.signal,
        }),
      );
    },
  };
}
