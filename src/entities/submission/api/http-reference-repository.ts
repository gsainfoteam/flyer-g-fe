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
import type { ReferenceRepository } from "@/shared/api/repositories";
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
export function parseSignageConfig(payload: unknown): SignageConfig {
  const body = readObject(payload);
  return {
    maxUploadBytes: readNumber(body, "maxUploadBytes"),
    minShortEdgePx: readNumber(body, "minShortEdgePx"),
    titleMaxLength: readNumber(body, "titleMaxLength"),
    maxPublishMonths: readNumber(body, "maxPublishMonths"),
    minLeadTimeHours: readNumber(body, "minLeadTimeHours"),
    allowedMimeTypes: readStringArray(body, "allowedMimeTypes"),
    allowedDetailUrlHosts: readStringArray(body, "allowedDetailUrlHosts"),
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
