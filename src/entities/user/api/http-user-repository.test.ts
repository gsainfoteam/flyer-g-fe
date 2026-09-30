import { describe, expect, it, vi } from "vitest";
import type { HttpClient, HttpRequest } from "@/shared/api/http-client";
import { createHttpUserRepository } from "./http-user-repository";

/** Swagger `AdminUserDto` 예시 모양 */
const USER = {
  id: "6f1c2c1e-0000-4000-8000-000000000002",
  name: "김지스트",
  email: "gist@gm.gist.ac.kr",
  studentId: "20245001",
  grantedRoles: ["REVIEWER"],
  lastLoginAt: "2026-09-30T08:00:00.000Z",
  createdAt: "2026-03-02T01:00:00.000Z",
};

const PAGE = {
  items: [USER],
  nextCursor: "WyLquYDsp4DsiqTtirgiXQ",
  totalCount: 41,
  serverTime: "2026-10-01T03:00:00.000Z",
};

function fakeClient(response: unknown) {
  const calls: HttpRequest[] = [];
  const client: HttpClient = {
    request: vi.fn(async (call: HttpRequest) => {
      calls.push(call);
      return response;
    }) as HttpClient["request"],
  };
  return { repository: createHttpUserRepository(client), calls };
}

describe("createHttpUserRepository", () => {
  it("검색어·역할·cursor를 query로 보내고 페이지를 읽는다", async () => {
    const { repository, calls } = fakeClient(PAGE);

    const page = await repository.list({
      q: "  김지  ",
      role: "REVIEWER",
      cursor: "abc",
      limit: 20,
    });

    expect(calls[0]).toMatchObject({
      path: "/signage/users",
      query: { q: "김지", role: "REVIEWER", cursor: "abc", limit: 20 },
    });
    expect(page).toEqual({
      items: [
        {
          ...USER,
          grantedRoles: ["REVIEWER"],
          lastLoginAt: new Date(USER.lastLoginAt),
          createdAt: new Date(USER.createdAt),
        },
      ],
      nextCursor: PAGE.nextCursor,
      totalCount: 41,
      serverTime: new Date(PAGE.serverTime),
    });
  });

  it("빈 검색어는 보내지 않는다", async () => {
    const { repository, calls } = fakeClient(PAGE);

    await repository.list({ q: "   " });

    expect(calls[0]!.query!.q).toBeUndefined();
  });

  it("학번이 없는 사람을 읽는다", async () => {
    const { repository } = fakeClient({
      ...PAGE,
      items: [{ ...USER, studentId: null, grantedRoles: [] }],
    });

    const page = await repository.list({});

    expect(page.items[0]).toMatchObject({ studentId: null, grantedRoles: [] });
  });

  it("모르는 역할이 오면 응답 오류로 멈춘다", async () => {
    const { repository } = fakeClient({
      ...PAGE,
      items: [{ ...USER, grantedRoles: ["SUBMITTER"] }],
    });

    await expect(repository.list({})).rejects.toMatchObject({
      code: "INVALID_RESPONSE",
    });
  });

  it("부여는 PUT이고 부여 후 사용자를 돌려준다", async () => {
    const { repository, calls } = fakeClient({
      ...USER,
      grantedRoles: ["REVIEWER", "SUPER_ADMIN"],
    });

    const user = await repository.grantRole(USER.id, "SUPER_ADMIN");

    expect(calls[0]).toMatchObject({
      method: "PUT",
      path: `/signage/users/${USER.id}/roles/SUPER_ADMIN`,
    });
    expect(calls[0]!.body).toBeUndefined();
    expect(user.grantedRoles).toEqual(["REVIEWER", "SUPER_ADMIN"]);
  });

  it("회수는 DELETE다", async () => {
    const { repository, calls } = fakeClient(undefined);

    await expect(
      repository.revokeRole(USER.id, "REVIEWER"),
    ).resolves.toBeUndefined();

    expect(calls[0]).toMatchObject({
      method: "DELETE",
      path: `/signage/users/${USER.id}/roles/REVIEWER`,
    });
  });
});
