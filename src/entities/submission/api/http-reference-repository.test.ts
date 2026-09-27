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
        { id: "grp_a", name: "학사기숙사 A동", deviceCount: 2 },
      ],
    });
    const repository = createHttpReferenceRepository(client);
    const signal = new AbortController().signal;

    await expect(repository.getConfig(signal)).resolves.toEqual(CONFIG);
    await expect(repository.listCategories()).resolves.toEqual([
      { id: "notice", name: "공지" },
    ]);
    await expect(repository.listTargetGroups()).resolves.toEqual([
      { id: "grp_a", name: "학사기숙사 A동", deviceCount: 2 },
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

  it("응답 모양이 틀리면 어느 필드인지 알리며 멈춘다", async () => {
    const { client } = fakeClient({
      "/signage/config": { ...CONFIG, maxPublishMonths: "3" },
      "/signage/target-groups": [{ id: "grp_a", name: "A동" }],
    });
    const repository = createHttpReferenceRepository(client);

    await expect(repository.getConfig()).rejects.toMatchObject({
      code: "INVALID_RESPONSE",
      message: expect.stringContaining("maxPublishMonths"),
    });
    await expect(repository.listTargetGroups()).rejects.toMatchObject({
      code: "INVALID_RESPONSE",
      message: expect.stringContaining("[0].deviceCount"),
    });
  });
});
