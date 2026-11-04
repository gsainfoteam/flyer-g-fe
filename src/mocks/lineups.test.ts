import { describe, expect, it } from "vitest";
import { DEFAULT_LINEUP_SETTINGS, newSubmissionBlock } from "@/entities/lineup/model/types";
import { createFixedClock } from "@/shared/lib/clock";
import { createMockRepositories } from "./repositories";
import { MOCK_USERS } from "./users";

const now = new Date("2026-11-04T00:00:00Z");
const groupId = "group-house-a";
const setup = (role: keyof typeof MOCK_USERS = "SUPER_ADMIN") =>
  createMockRepositories({ clock: createFixedClock(now), session: () => MOCK_USERS[role] });

describe("편성 mock repository", () => {
  it("있는 그룹과 새 그룹에 기본 포스터 편성을 제공한다", async () => {
    const repos = setup();
    const current = await repos.lineups.get(groupId);
    expect(current).toMatchObject({
      groupId, version: 1, settings: DEFAULT_LINEUP_SETTINGS,
      blocks: [{ ...newSubmissionBlock("POSTER"), id: expect.stringMatching(/^blk_/) }],
      updatedAt: now.toISOString(),
    });
    expect(await repos.lineups.get(groupId)).toEqual(current);
    const group = await repos.reference.createTargetGroup({ name: "새 편성 그룹" });
    expect(await repos.lineups.get(group.id)).toMatchObject({ groupId: group.id, version: 1 });
    await expect(repos.lineups.listPrograms()).resolves.toEqual([]);
  });

  it("순서·기존 ID를 유지하고 새 블록 ID와 버전을 발급한다", async () => {
    const repos = setup();
    const current = await repos.lineups.get(groupId);
    const blocks = [newSubmissionBlock("STORY"), current.blocks[0]!];
    const updated = await repos.lineups.save(groupId, { ...current, blocks });
    expect(updated.version).toBe(2);
    expect(updated.blocks.map((block) => block.submissionType)).toEqual(["STORY", "POSTER"]);
    expect(updated.blocks[1]?.id).toBe(current.blocks[0]?.id);
    expect(updated.blocks[0]?.id).not.toBe(current.blocks[0]?.id);
    blocks[0]!.durationSeconds = 100;
    updated.settings.rotationSeconds = 60;
    const fetched = await repos.lineups.get(groupId);
    expect(fetched.blocks[0]?.durationSeconds).toBe(20);
    expect(fetched.settings.rotationSeconds).toBe(10);
    await expect(repos.lineups.save(groupId, current)).rejects.toMatchObject({ status: 409, code: "CONFLICT" });
    const empty = await repos.lineups.save(groupId, { ...fetched, blocks: [] });
    expect(empty).toMatchObject({ version: 3, blocks: [] });
    expect((await repos.lineups.get(groupId)).blocks).toEqual([]);
  });

  it.each(["SUBMITTER", "REVIEWER"] as const)("%s에게 편성 조회·저장·프로그램 목록을 허용하지 않는다", async (role) => {
    const repos = setup(role);
    await expect(repos.lineups.get(groupId)).rejects.toMatchObject({ status: 403 });
    await expect(repos.lineups.save(groupId, { version: 1, settings: DEFAULT_LINEUP_SETTINGS, blocks: [] })).rejects.toMatchObject({ status: 403 });
    await expect(repos.lineups.listPrograms()).rejects.toMatchObject({ status: 403 });
  });

  it("없는 그룹과 취소된 요청을 거절한다", async () => {
    const repos = setup();
    await expect(repos.lineups.get("missing")).rejects.toMatchObject({ status: 404 });
    await expect(repos.lineups.save("missing", { version: 1, settings: DEFAULT_LINEUP_SETTINGS, blocks: [] })).rejects.toMatchObject({ status: 404 });
    const signal = AbortSignal.abort();
    await expect(repos.lineups.get(groupId, signal)).rejects.toMatchObject({ name: "AbortError" });
    await expect(repos.lineups.listPrograms(signal)).rejects.toMatchObject({ name: "AbortError" });
  });

  it("유효하지 않은 블록과 프로그램 참조는 저장하지 않는다", async () => {
    const repos = setup();
    const current = await repos.lineups.get(groupId);
    await expect(repos.lineups.save(groupId, {
      ...current, blocks: [{ ...newSubmissionBlock("STORY"), durationSeconds: 0 }],
    })).rejects.toMatchObject({ status: 422, fields: { "blocks.0": expect.any(String) } });
    await expect(repos.lineups.save(groupId, {
      ...current, blocks: [current.blocks[0]!, current.blocks[0]!],
    })).rejects.toMatchObject({ status: 422, fields: { "blocks.1.id": expect.any(String) } });
    await expect(repos.lineups.save(groupId, {
      ...current, settings: { ...current.settings, infoBar: [{ item: "DDAY", programId: "missing" }] },
    })).rejects.toMatchObject({ status: 422, fields: { "settings.infoBar.0.programId": expect.any(String) } });
    expect(await repos.lineups.get(groupId)).toEqual(current);
  });
});
