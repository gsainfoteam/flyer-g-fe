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
import type { UserRepository } from "@/shared/api/repositories";
import type { Page } from "@/entities/submission/model/types";
import { isGrantableRole } from "../model/types";
import type { AdminUser, GrantableRole } from "../model/types";

/**
 * 사용자 역할 관리의 실제 구현. 모두 SUPER_ADMIN만. (gsainfoteam/flyer-g-be#17)
 *
 * | 메서드 | 경로 |
 * |---|---|
 * | list | `GET /signage/users?q=&role=&cursor=&limit=` |
 * | grantRole | `PUT /signage/users/{id}/roles/{role}` → 부여 후 사용자 |
 * | revokeRole | `DELETE /signage/users/{id}/roles/{role}` → 204 |
 */
function parseAdminUser(payload: unknown, path = "응답"): AdminUser {
  const body = readObject(payload, path);
  const grantedRoles = readArray(body.grantedRoles, `${path}.grantedRoles`);
  return {
    id: readString(body, "id", `${path}.id`),
    name: readString(body, "name", `${path}.name`),
    email: readString(body, "email", `${path}.email`),
    studentId: readNullableString(body, "studentId", `${path}.studentId`),
    // 모르는 역할이 오면 화면이 역할을 잘못 보여 준다. 조용히 버리지 않고 멈춘다.
    grantedRoles: grantedRoles.map((role, index) => {
      if (!isGrantableRole(role)) {
        throw invalidResponse(
          `${path}.grantedRoles[${index}]`,
          "REVIEWER 또는 SUPER_ADMIN",
        );
      }
      return role;
    }),
    lastLoginAt: readIsoDate(body, "lastLoginAt", `${path}.lastLoginAt`),
    createdAt: readIsoDate(body, "createdAt", `${path}.createdAt`),
  };
}

function parseAdminUserPage(payload: unknown): Page<AdminUser> {
  const body = readObject(payload);
  return {
    items: readArray(body.items, "items").map((item, index) =>
      parseAdminUser(item, `items[${index}]`),
    ),
    nextCursor: readNullableString(body, "nextCursor"),
    totalCount: readNumber(body, "totalCount"),
    serverTime: readIsoDate(body, "serverTime"),
  };
}

const rolePath = (userId: string, role: GrantableRole) =>
  `/signage/users/${encodeURIComponent(userId)}/roles/${role}`;

export function createHttpUserRepository(client: HttpClient): UserRepository {
  return {
    async list({ q, role, cursor, limit }, signal) {
      return parseAdminUserPage(
        await client.request({
          path: "/signage/users",
          // 빈 검색어는 보내지 않는다. 서버도 앞뒤 공백을 지우고 비면 전체로 본다.
          query: { q: q?.trim() || undefined, role, cursor, limit },
          signal,
        }),
      );
    },

    async grantRole(userId, role, signal) {
      return parseAdminUser(
        await client.request({
          method: "PUT",
          path: rolePath(userId, role),
          signal,
        }),
      );
    },

    async revokeRole(userId, role, signal) {
      await client.request({
        method: "DELETE",
        path: rolePath(userId, role),
        signal,
      });
    },
  };
}
