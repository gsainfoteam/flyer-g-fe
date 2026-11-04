import { parseLineupBlock, parseLineupSettings } from "@/entities/lineup/api/parse";
import {
  DEFAULT_LINEUP_SETTINGS,
  DEFAULT_PER_VISIT,
  newSubmissionBlock,
} from "@/entities/lineup/model/types";
import type { Lineup } from "@/entities/lineup/model/types";
import { ApiError } from "@/shared/api/error";
import type { LineupRepository } from "@/shared/api/repositories";
import type { Clock } from "@/shared/lib/clock";
import type { Playlist } from "@/entities/playlist/model/types";

interface Dependencies {
  clock: Clock;
  settle: (signal?: AbortSignal) => Promise<void>;
  requireSuperAdmin: () => unknown;
  findGroup: (id: string) => unknown;
  preview: (id: string, signal?: AbortSignal) => Promise<Playlist>;
}

/** 그룹마다 독립적인 편성. 반환값이나 저장 입력을 수정해도 저장소는 바뀌지 않는다. */
export function createMockLineupRepository({
  clock,
  settle,
  requireSuperAdmin,
  findGroup,
  preview,
}: Dependencies): LineupRepository & { peekSaved(groupId: string): Lineup | undefined } {
  const saved = new Map<string, Lineup>();
  let sequence = 0;
  const nextBlockId = () => `blk_mock_${++sequence}`;
  const validationFailed = (fields: Record<string, string>) => new ApiError({
    kind: "http",
    status: 422,
    code: "VALIDATION_FAILED",
    message: "편성 입력을 확인해 주세요.",
    fields,
  });
  const parseInput = <T>(path: string, parse: () => T): T => {
    try {
      return parse();
    } catch (error) {
      if (!(error instanceof ApiError) || error.kind !== "parse") throw error;
      throw validationFailed({ [path]: "편성 값이 올바르지 않습니다." });
    }
  };
  const getCurrent = (groupId: string): Lineup => {
    findGroup(groupId);
    let current = saved.get(groupId);
    if (!current) {
      current = {
        groupId,
        version: 1,
        settings: structuredClone(DEFAULT_LINEUP_SETTINGS),
        blocks: [{ ...newSubmissionBlock("POSTER"), id: nextBlockId() }],
        updatedAt: clock.now().toISOString(),
      };
      saved.set(groupId, current);
    }
    return current;
  };

  return {
    async preview(id, signal) { requireSuperAdmin(); return preview(id, signal); },
    // Legacy fixtures retain their layout until an operator saves a lineup.
    peekSaved(groupId) {
      const lineup = saved.get(groupId);
      return lineup && lineup.version > 1 ? structuredClone(lineup) : undefined;
    },
    async get(groupId, signal) {
      await settle(signal);
      requireSuperAdmin();
      return structuredClone(getCurrent(groupId));
    },
    async save(groupId, input, signal) {
      await settle(signal);
      requireSuperAdmin();
      const current = getCurrent(groupId);
      if (input.version !== current.version) {
        throw new ApiError({
          kind: "http", status: 409, code: "CONFLICT",
          message: "편성이 변경되었습니다. 최신 상태를 다시 불러오세요.",
        });
      }
      const settings = parseInput("settings", () => parseLineupSettings(input.settings));
      const fields: Record<string, string> = {};
      if (input.blocks.length > 30) fields.blocks = "블록은 30개까지입니다.";
      if (settings.quietHours.length > 4) {
        fields["settings.quietHours"] = "화면 끔 시간은 4개까지입니다.";
      }
      // 운영 컨텐츠 생성 API가 없는 mock은 빈 프로그램 목록에서 시작한다.
      settings.infoBar.forEach((_, index) => {
        fields[`settings.infoBar.${index}.programId`] = "없는 운영 컨텐츠입니다.";
      });
      const existingIds = new Set(current.blocks.map((block) => block.id));
      const seenIds = new Set<string>();
      const blocks = input.blocks.map((block, index) => {
        if (block.id !== undefined) {
          if (!existingIds.has(block.id) || seenIds.has(block.id)) {
            fields[`blocks.${index}.id`] = "현재 편성의 블록 ID를 중복 없이 보내세요.";
          }
          seenIds.add(block.id);
        }
        if (block.source === "PROGRAM") {
          fields[`blocks.${index}.programId`] = "없는 운영 컨텐츠입니다.";
        }
        return parseInput(`blocks.${index}`, () => parseLineupBlock({
          ...block,
          id: block.id ?? nextBlockId(),
          perVisit: block.source === "SUBMISSIONS" && block.submissionType
            ? block.perVisit ?? DEFAULT_PER_VISIT[block.submissionType]
            : null,
        }));
      });
      if (Object.keys(fields).length) throw validationFailed(fields);
      const updated: Lineup = structuredClone({
        groupId, version: current.version + 1, settings, blocks,
        updatedAt: clock.now().toISOString(),
      });
      saved.set(groupId, updated);
      return structuredClone(updated);
    },
    async listPrograms(signal) {
      await settle(signal);
      requireSuperAdmin();
      return [];
    },
  };
}
