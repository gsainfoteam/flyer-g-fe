import type {
  TargetGroup,
  TargetGroupInput,
  UpdateTargetGroupInput,
} from "@/entities/device/model/types";
import type { ApiRequestBody } from "@/shared/api/contract";
import type { HttpClient } from "@/shared/api/http-client";
import {
  readArray,
  readBoolean,
  readNumber,
  readObject,
  readString,
  readStringArray,
} from "@/shared/api/parse";
import type { JsonObject } from "@/shared/api/parse";
import type { ReferenceRepository } from "@/shared/api/repositories";
import { SUBMISSION_KINDS } from "../model/kind";
import type { SubmissionKind } from "../model/kind";
import type { Category, SignageConfig } from "../model/policy";

/**
 * 참조 데이터와 운영 설정의 실제 구현 (`API-REQUIREMENTS.md` 10절).
 *
 * - `GET /signage/config`: 게시 운영 제한값
 * - `GET /signage/categories`: 숨기지 않은 카테고리
 * - `GET /signage/target-groups`: 대상 위치 묶음과 활성 기기 수. 숨긴 그룹도 온다
 * - `POST /signage/target-groups`, `PATCH·DELETE /signage/target-groups/{id}`: 그룹
 *   추가·이름 변경·숨김·삭제. SUPER_ADMIN만. 쓰는 곳이 있는 그룹을 지우면 409
 *
 * 조회는 로그인한 누구나 한다. 응답은 화면이 쓰는 필드만 검증해 도메인 값으로 옮긴다.
 */
/**
 * 배포마다 새로 생긴 값. 아직 그 배포가 나가지 않은 서버는 주지 않으므로 서버가
 * 정한 기본값으로 둔다(`API-FOLLOWUP-2026-10-30` 백엔드 알림 1-3).
 */
const CONFIG_DEFAULTS = {
  maxVideoUploadBytes: 100 * 1024 * 1024,
  maxVideoDurationSeconds: 30,
  eventBannerMaxDays: 3,
  storyDisplayDays: 2,
} as const;

function readOptionalNumber(
  body: JsonObject,
  key: keyof typeof CONFIG_DEFAULTS,
): number {
  return body[key] === undefined || body[key] === null
    ? CONFIG_DEFAULTS[key]
    : readNumber(body, key);
}

/** 종류별 하루 한도. 한도가 있는 종류만 온다. 모르는 종류는 버린다. */
function readDailyLimits(
  value: unknown,
): Partial<Record<SubmissionKind, number>> {
  if (value === undefined || value === null) return {};
  const limits = readObject(value, "dailySubmissionLimits");
  return Object.fromEntries(
    SUBMISSION_KINDS.filter((kind) => limits[kind] !== undefined).map(
      (kind) => [
        kind,
        readNumber(limits, kind, `dailySubmissionLimits.${kind}`),
      ],
    ),
  );
}

export function parseSignageConfig(payload: unknown): SignageConfig {
  const body = readObject(payload);
  return {
    maxUploadBytes: readNumber(body, "maxUploadBytes"),
    titleMaxLength: readNumber(body, "titleMaxLength"),
    maxPublishMonths: readNumber(body, "maxPublishMonths"),
    allowedMimeTypes: readStringArray(body, "allowedMimeTypes"),
    allowedDetailUrlHosts: readStringArray(body, "allowedDetailUrlHosts"),
    maxVideoUploadBytes: readOptionalNumber(body, "maxVideoUploadBytes"),
    maxVideoDurationSeconds: readOptionalNumber(
      body,
      "maxVideoDurationSeconds",
    ),
    eventBannerMaxDays: readOptionalNumber(body, "eventBannerMaxDays"),
    storyDisplayDays: readOptionalNumber(body, "storyDisplayDays"),
    dailySubmissionLimits: readDailyLimits(body.dailySubmissionLimits),
  };
}

export function parseCategories(payload: unknown): Category[] {
  return readArray(payload).map((item, index) => {
    const category = readObject(item, `[${index}]`);
    return {
      id: readString(category, "id", `[${index}].id`),
      name: readString(category, "name", `[${index}].name`),
    };
  });
}

export function parseTargetGroup(payload: unknown, path = "그룹"): TargetGroup {
  const group = readObject(payload, path);
  return {
    id: readString(group, "id", `${path}.id`),
    name: readString(group, "name", `${path}.name`),
    deviceCount: readNumber(group, "deviceCount", `${path}.deviceCount`),
    isHidden: readBoolean(group, "isHidden", `${path}.isHidden`),
  };
}

export function parseTargetGroups(payload: unknown): TargetGroup[] {
  return readArray(payload).map((item, index) =>
    parseTargetGroup(item, `[${index}]`),
  );
}

const groupPath = (id: string) =>
  `/signage/target-groups/${encodeURIComponent(id)}`;

export function createHttpReferenceRepository(
  client: HttpClient,
): ReferenceRepository {
  return {
    async getConfig(signal) {
      return parseSignageConfig(
        await client.request({ path: "/signage/config", signal }),
      );
    },

    async listCategories(signal) {
      return parseCategories(
        await client.request({ path: "/signage/categories", signal }),
      );
    },

    async listTargetGroups(signal) {
      return parseTargetGroups(
        await client.request({ path: "/signage/target-groups", signal }),
      );
    },

    async createTargetGroup(input: TargetGroupInput, signal) {
      return parseTargetGroup(
        await client.request({
          method: "POST",
          path: "/signage/target-groups",
          body: input satisfies ApiRequestBody<"CreateTargetGroupDto">,
          signal,
        }),
      );
    },

    async updateTargetGroup(id, input: UpdateTargetGroupInput, signal) {
      return parseTargetGroup(
        await client.request({
          method: "PATCH",
          path: groupPath(id),
          body: input satisfies ApiRequestBody<"UpdateTargetGroupDto">,
          signal,
        }),
      );
    },

    async deleteTargetGroup(id, signal) {
      await client.request({ method: "DELETE", path: groupPath(id), signal });
    },
  };
}
