import type { LayoutType } from "@/entities/playlist/model/types";

export type LineupSubmissionType = "POSTER" | "EVENT_BANNER" | "STORY";
export type BlockSchedule =
  | { type: "ALWAYS" }
  | {
      type: "WINDOWS";
      windows: { days: number[]; start: string; end: string }[];
    }
  | { type: "DATE_RANGE"; from: string; to: string };

export interface LineupSettings {
  posterLayout: LayoutType;
  rotationSeconds: number;
  refreshAfterSeconds: number;
  infoBar: { item: string; programId: string }[];
  quietHours: { start: string; end: string }[];
}

export interface LineupBlock {
  id: string;
  source: "SUBMISSIONS" | "PROGRAM";
  submissionType: LineupSubmissionType | null;
  programId: string | null;
  durationSeconds: number;
  perVisit: number | null;
  schedule: BlockSchedule;
  enabled: boolean;
}

export interface Lineup {
  groupId: string;
  version: number;
  settings: LineupSettings;
  blocks: LineupBlock[];
  updatedAt: string;
}

export interface LineupInput {
  version: number;
  settings: LineupSettings;
  blocks: (Omit<LineupBlock, "id"> & { id?: string })[];
}

export interface LineupProgram {
  type: string;
  name: string;
  params: Record<string, unknown>;
  data: Record<string, unknown> | null;
}

/** Optional on old playlists and caches. An empty blocks array means an empty lineup. */
export interface PlaybackLineup {
  settings: LineupSettings;
  blocks: LineupBlock[];
  programs: Record<string, LineupProgram>;
}

export const LINEUP_LABELS: Record<LineupSubmissionType, string> = {
  POSTER: "포스터",
  EVENT_BANNER: "이벤트 배너",
  STORY: "소식 제보",
};
export const DEFAULT_PER_VISIT = {
  POSTER: 3,
  EVENT_BANNER: 1,
  STORY: 2,
} as const;
export const DEFAULT_LINEUP_SETTINGS: LineupSettings = {
  posterLayout: "WALL",
  rotationSeconds: 10,
  refreshAfterSeconds: 60,
  infoBar: [],
  quietHours: [],
};

export function newSubmissionBlock(
  type: LineupSubmissionType,
): LineupInput["blocks"][number] {
  return {
    source: "SUBMISSIONS",
    submissionType: type,
    programId: null,
    durationSeconds: type === "POSTER" ? 60 : type === "STORY" ? 20 : 15,
    perVisit: DEFAULT_PER_VISIT[type],
    schedule: { type: "ALWAYS" },
    enabled: true,
  };
}
