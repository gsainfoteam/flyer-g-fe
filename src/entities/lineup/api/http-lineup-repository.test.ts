import { describe, expect, it, vi } from "vitest";
import type { HttpClient } from "@/shared/api/http-client";
import { ApiError } from "@/shared/api/error";
import { DEFAULT_LINEUP_SETTINGS, newSubmissionBlock } from "../model/types";
import { createHttpLineupRepository } from "./http-lineup-repository";
import { parseLineup } from "./parse";
import { parsePlaylist } from "@/entities/playlist/api/http-display-repository";
import { toPlaylistDto, toPlaylist } from "@/entities/playlist/model/mapper";

const lineup = {
  groupId: "grp_a",
  version: 2,
  settings: DEFAULT_LINEUP_SETTINGS,
  blocks: [{ ...newSubmissionBlock("EVENT_BANNER"), id: "blk_events" }],
  updatedAt: "2026-11-04T00:00:00Z",
  updatedBy: null,
};

describe("편성 HTTP 계약", () => {
  it("전체 편성을 받은 버전과 블록 ID 그대로 PUT한다", async () => {
    const request = vi.fn().mockResolvedValue(lineup);
    const repository = createHttpLineupRepository({ request } as HttpClient);
    const current = await repository.get("group/a");
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "/signage/target-groups/group%2Fa/lineup",
      }),
    );
    const input = {
      version: current.version,
      settings: current.settings,
      blocks: current.blocks,
    };
    await repository.save("grp_a", input);
    expect(request).toHaveBeenLastCalledWith(
      expect.objectContaining({
        path: "/signage/target-groups/grp_a/lineup",
        method: "PUT",
        body: input,
      }),
    );
    request.mockRejectedValueOnce(
      new ApiError({
        kind: "http",
        code: "CONFLICT",
        status: 409,
        message: "changed",
      }),
    );
    await expect(repository.save("grp_a", input)).rejects.toMatchObject({
      status: 409,
    });
  });
  it("블록·프로그램·일정을 v2 파싱과 오프라인 캐시 변환에서 유지한다", () => {
    const playlist = parsePlaylist({
      serverTime: "2026-11-04T00:00:00Z",
      deviceName: "로비",
      playlistVersion: "v2",
      refreshAfterSeconds: 60,
      settings: lineup.settings,
      blocks: lineup.blocks,
      programs: {
        prg_d: {
          type: "DDAY",
          name: "시험",
          params: { label: "시험", date: "2026-12-01" },
          data: null,
        },
      },
      submissions: { POSTER: [], EVENT_BANNER: [], STORY: [] },
    });
    expect(playlist.lineup?.blocks).toEqual(lineup.blocks);
    expect(toPlaylist(toPlaylistDto(playlist)).lineup).toEqual(playlist.lineup);
    expect(
      toPlaylist(toPlaylistDto({ ...playlist, lineup: undefined })).lineup,
    ).toBeUndefined();
  });
  it("잘못된 시간대와 숫자를 조용히 기본값으로 저장하지 않는다", () => {
    expect(() =>
      parseLineup({
        ...lineup,
        blocks: [{ ...lineup.blocks[0], durationSeconds: -1 }],
      }),
    ).toThrow(ApiError);
    expect(() =>
      parseLineup({
        ...lineup,
        blocks: [
          {
            ...lineup.blocks[0],
            schedule: {
              type: "WINDOWS",
              windows: [{ days: [8], start: "09:00", end: "18:00" }],
            },
          },
        ],
      }),
    ).toThrow(ApiError);
  });
});
