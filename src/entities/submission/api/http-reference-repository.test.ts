import { describe, expect, it, vi } from "vitest";
import type { HttpClient, HttpRequest } from "@/shared/api/http-client";
import { createHttpReferenceRepository } from "./http-reference-repository";

/** 경로별 응답을 정해 두는 client. 부른 요청을 기록한다. */
function fakeClient(responses: Record<string, unknown>) {
  const calls: HttpRequest[] = [];
  const client: HttpClient = {
    request: vi.fn(async (request: HttpRequest) => {
      calls.push(request);
      if (!(request.path in responses)) throw new Error(request.path);
      return responses[request.path];
    }) as HttpClient["request"],
  };
  return { client, calls };
}

const CONFIG = {
  maxUploadBytes: 10485760,
  minShortEdgePx: 1080,
  titleMaxLength: 80,
  maxPublishMonths: 3,
  minLeadTimeHours: 24,
  allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  allowedDetailUrlHosts: ["ziggle.gistory.me"],
};

describe("createHttpReferenceRepository", () => {
  it("운영 설정·카테고리·대상 그룹을 서버 경로에서 받는다", async () => {
    const { client, calls } = fakeClient({
      "/signage/config": CONFIG,
      "/signage/categories": [{ id: "notice", name: "공지" }],
      "/signage/target-groups": [
        {
          id: "grp_a",
          name: "학사기숙사 A동",
          deviceCount: 2,
          isHidden: false,
        },
      ],
    });
    const repository = createHttpReferenceRepository(client);
    const signal = new AbortController().signal;

    await expect(repository.getConfig(signal)).resolves.toEqual(CONFIG);
    await expect(repository.listCategories()).resolves.toEqual([
      { id: "notice", name: "공지" },
    ]);
    await expect(repository.listTargetGroups()).resolves.toEqual([
      { id: "grp_a", name: "학사기숙사 A동", deviceCount: 2, isHidden: false },
    ]);
    expect(calls[0]).toMatchObject({ path: "/signage/config", signal });
  });

  it("모르는 필드는 버리고 화면이 쓰는 필드만 옮긴다", async () => {
    const { client } = fakeClient({
      "/signage/categories": [{ id: "club", name: "동아리", hidden: false }],
    });

    await expect(
      createHttpReferenceRepository(client).listCategories(),
    ).resolves.toEqual([{ id: "club", name: "동아리" }]);
  });

  it("그룹 추가·수정·삭제를 서버 경로와 본문으로 보낸다", async () => {
    const group = {
      id: "grp_0123456789abcdef",
      name: "학사기숙사 C동",
      deviceCount: 0,
      isHidden: false,
    };
    const { client, calls } = fakeClient({
      "/signage/target-groups": group,
      "/signage/target-groups/grp_0123456789abcdef": {
        ...group,
        isHidden: true,
      },
    });
    const repository = createHttpReferenceRepository(client);

    await expect(
      repository.createTargetGroup({ name: "학사기숙사 C동" }),
    ).resolves.toEqual(group);
    await expect(
      repository.updateTargetGroup(group.id, { isHidden: true }),
    ).resolves.toMatchObject({ isHidden: true });
    await expect(
      repository.deleteTargetGroup(group.id),
    ).resolves.toBeUndefined();

    expect(
      calls.map(({ method, path, body }) => ({ method, path, body })),
    ).toEqual([
      {
        method: "POST",
        path: "/signage/target-groups",
        body: { name: "학사기숙사 C동" },
      },
      {
        method: "PATCH",
        path: "/signage/target-groups/grp_0123456789abcdef",
        body: { isHidden: true },
      },
      {
        method: "DELETE",
        path: "/signage/target-groups/grp_0123456789abcdef",
        body: undefined,
      },
    ]);
  });

  it("응답 모양이 틀리면 어느 필드인지 알리며 멈춘다", async () => {
    const { client } = fakeClient({
      "/signage/config": { ...CONFIG, maxPublishMonths: "3" },
      "/signage/target-groups": [{ id: "grp_a", name: "A동", deviceCount: 1 }],
    });
    const repository = createHttpReferenceRepository(client);

    await expect(repository.getConfig()).rejects.toMatchObject({
      code: "INVALID_RESPONSE",
      message: expect.stringContaining("maxPublishMonths"),
    });
    await expect(repository.listTargetGroups()).rejects.toMatchObject({
      code: "INVALID_RESPONSE",
      message: expect.stringContaining("[0].isHidden"),
    });
  });
});
