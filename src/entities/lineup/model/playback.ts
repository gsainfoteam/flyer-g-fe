import type { PosterRenderModel } from "@/entities/poster";
import {
  buildContentFrames,
  buildFrames,
  posterFrameSeconds,
} from "@/entities/poster/model/frames";
import type { ContentScenes } from "@/entities/poster/model/frames";
import { buildWidgetContent } from "@/entities/widget/model/content";
import type { WidgetPick } from "@/entities/widget/model/policy";
import type { PlayerFrame } from "@/entities/widget/model/schedule";
import type { WidgetSlot } from "@/entities/widget/model/types";
import { isGameWidget } from "@/entities/widget/model/types";
import { WIDGET_LABELS } from "@/entities/widget/model/settings";
import { isQuietAt, isScheduleActive } from "./schedule";
import { LINEUP_LABELS } from "./types";
import type { LineupBlock, LineupProgram, PlaybackLineup } from "./types";

export interface TimedScene {
  frame: PlayerFrame;
  seconds: number;
}
export interface Visit {
  scenes: TimedScene[];
  lastId: string | null;
}
export interface PlaybackContext {
  lineup: PlaybackLineup;
  posters: PosterRenderModel[];
  content: ContentScenes;
  canHostGame: boolean;
  widgetRatio: number;
  peekWidget?: () => WidgetPick | null;
  pickWidget?: (avoidId?: string) => WidgetPick | null;
}

/** Server program kinds use date-only values. Adapt them to existing TV renderers. */
export function programSlot(
  id: string,
  program: LineupProgram,
  seconds: number,
): WidgetSlot | null {
  const type = program.type === "DAILY_PILLAR" ? "FORTUNE" : program.type;
  if (
    type !== "DDAY" &&
    type !== "EXAM_CHEER" &&
    type !== "FORTUNE" &&
    type !== "CLICK_BATTLE"
  )
    return null;
  const params = { ...program.params };
  if (typeof params.date === "string") {
    const date = `${params.date}T00:00:00+09:00`;
    if (type === "DDAY") params.date = date;
    if (type === "EXAM_CHEER") {
      params.startsAt = date;
      params.endsAt = `${params.date}T23:59:59+09:00`;
    }
  }
  return {
    id,
    type,
    durationSeconds: seconds,
    params: { ...params, ...(program.data ? { data: program.data } : {}) },
  };
}

function nextItems<T>(
  items: T[],
  lastId: string | undefined,
  count: number,
  id: (item: T) => string,
): T[] {
  const last = lastId ? items.findIndex((item) => id(item) === lastId) : -1;
  return Array.from(
    { length: Math.min(count, items.length) },
    (_, n) => items[(last + 1 + n) % items.length]!,
  );
}

/** Duration is a block budget; text and videos retain their minimum readable duration. */
export function buildVisit(
  block: LineupBlock,
  ctx: PlaybackContext,
  now: Date,
  lastId?: string,
): Visit {
  if (!block.enabled || !isScheduleActive(block.schedule, now))
    return { scenes: [], lastId: null };
  if (block.source === "PROGRAM") {
    const program = block.programId
      ? ctx.lineup.programs[block.programId]
      : undefined;
    const slot =
      program && programSlot(block.programId!, program, block.durationSeconds);
    const content =
      slot && (!isGameWidget(slot.type) || ctx.canHostGame)
        ? buildWidgetContent(slot, now)
        : null;
    return {
      scenes:
        slot && content
          ? [
              {
                frame: {
                  kind: "widget",
                  key: `${block.id}:program`,
                  slot,
                  content,
                },
                seconds: block.durationSeconds,
              },
            ]
          : [],
      lastId: null,
    };
  }
  const count = block.perVisit ?? 1;
  let selectedId: string | null = null;
  const settings = ctx.lineup.settings;
  const frames = (() => {
    if (block.submissionType === "POSTER") {
      const selected = nextItems(ctx.posters, lastId, count, (item) => item.id);
      selectedId = selected.at(-1)?.id ?? null;
      return buildFrames(selected, settings.posterLayout).map((frame) =>
        frame.kind === "strip"
          ? {
              ...frame,
              focusIndex: ctx.posters.findIndex(
                (p) => p.id === selected[frame.focusIndex]!.id,
              ),
            }
          : frame,
      );
    }
    if (block.submissionType === "EVENT_BANNER") {
      const selected = nextItems(
        ctx.content.eventBanners,
        lastId,
        count,
        (item) => item.submissionId,
      );
      selectedId = selected.at(-1)?.submissionId ?? null;
      return buildContentFrames({ eventBanners: selected, stories: [] });
    }
    const selected = nextItems(
      ctx.content.stories,
      lastId,
      count,
      (item) => item.submissionId,
    );
    selectedId = selected.at(-1)?.submissionId ?? null;
    return buildContentFrames({ eventBanners: [], stories: selected });
  })();
  const minimums = frames.map((f) =>
    posterFrameSeconds(f, ctx.posters, settings.rotationSeconds),
  );
  const total = minimums.reduce((a, b) => a + b, 0);
  const factor = total ? Math.max(1, block.durationSeconds / total) : 1;
  return {
    scenes: frames.map((frame, i) => ({
      frame: { ...frame, key: `${block.id}:${frame.key}` },
      seconds: minimums[i]! * factor,
    })),
    lastId: selectedId,
  };
}

export interface LineupPlayerSnapshot {
  currentFrame: PlayerFrame | undefined;
  frameSeconds: number;
  frameIndex: number;
  frameCount: number;
  serial: number;
  moving: boolean;
  quiet: boolean;
  blockId: string | null;
  upcomingLabel: string | null;
}
export const EMPTY_LINEUP_SNAPSHOT: LineupPlayerSnapshot = {
  currentFrame: undefined,
  frameSeconds: 10,
  frameIndex: 0,
  frameCount: 0,
  serial: 0,
  moving: false,
  quiet: false,
  blockId: null,
  upcomingLabel: null,
};

/** A cursor per block, retained across refreshes. No LCM-sized expanded playlist. */
export function createLineupPlayer(
  initialCursors: Record<string, string> = {},
) {
  const cursors = { ...initialCursors };
  let visit: Visit | null = null;
  let blockId: string | null = null;
  let blockSignature = "";
  let index = 0;
  let remaining = 0;
  let serial = 0;
  let quiet = false;
  let widgetCredit = 0;
  let widget: TimedScene | null = null;
  let lastWidgetId: string | undefined;
  let pendingNext = false;
  let sourceSignature = "";

  const current = () => widget ?? visit?.scenes[index];
  const start = () => {
    remaining = (current()?.seconds ?? 1) * 1000;
    serial++;
  };
  const resetVisit = () => {
    visit = null;
    widget = null;
    index = 0;
  };
  const nextBlock = (ctx: PlaybackContext, now: Date) => {
    resetVisit();
    const blocks = ctx.lineup.blocks;
    const previous = blocks.findIndex((block) => block.id === blockId);
    for (let step = 1; step <= blocks.length; step++) {
      const block = blocks[(previous + step) % blocks.length]!;
      const candidate = buildVisit(block, ctx, now, cursors[block.id]);
      if (!candidate.scenes.length) continue;
      blockId = block.id;
      blockSignature = JSON.stringify(block);
      visit = candidate;
      start();
      return;
    }
    blockId = null;
  };
  const advance = (ctx: PlaybackContext, now: Date) => {
    if (widget) {
      widget = null;
      // One interstitial per block. Remaining credit carries to later blocks.
      nextBlock(ctx, now);
      return;
    }
    if (visit && index + 1 < visit.scenes.length) {
      index++;
      start();
      return;
    }
    if (visit && blockId) {
      if (visit.lastId) cursors[blockId] = visit.lastId;
      const seconds = visit.scenes.reduce(
        (sum, scene) => sum + scene.seconds,
        0,
      );
      const ratio = Math.min(0.5, Math.max(0, ctx.widgetRatio / 100));
      widgetCredit = Math.min(
        300,
        widgetCredit + (seconds * ratio) / (1 - ratio),
      );
      const peek = ctx.peekWidget?.();
      if (peek && peek.slot.durationSeconds <= widgetCredit) {
        const pick = ctx.pickWidget?.(lastWidgetId);
        if (pick && pick.slot.durationSeconds <= widgetCredit) {
          widgetCredit -= pick.slot.durationSeconds;
          lastWidgetId = pick.slot.id;
          widget = {
            frame: {
              kind: "widget",
              key: `lineup-widget:${serial}`,
              slot: pick.slot,
              content: pick.content,
            },
            seconds: pick.slot.durationSeconds,
          };
          start();
          return;
        }
      }
    }
    nextBlock(ctx, now);
  };
  return {
    cursors,
    requestAdvance() {
      pendingNext = true;
    },
    tick(
      ctx: PlaybackContext,
      now: Date,
      elapsedMs: number,
      paused = false,
    ): LineupPlayerSnapshot {
      const sources = JSON.stringify([
        ctx.lineup.settings,
        ctx.lineup.programs,
        ctx.posters,
        ctx.content,
      ]);
      const wasQuiet = quiet;
      quiet = isQuietAt(ctx.lineup.settings.quietHours, now);
      if (quiet) {
        if (!wasQuiet) {
          resetVisit();
          serial++;
        }
      } else if (!paused || pendingNext) {
        const block = ctx.lineup.blocks.find((b) => b.id === blockId);
        const changed = block && JSON.stringify(block) !== blockSignature;
        if (
          !widget &&
          visit &&
          block &&
          !changed &&
          sources !== sourceSignature
        ) {
          const updated = buildVisit(block, ctx, now, cursors[block.id]);
          const found = updated.scenes.findIndex(
            (s) => s.frame.key === current()?.frame.key,
          );
          if (found >= 0) {
            visit = updated;
            index = found;
            remaining = Math.min(
              remaining,
              updated.scenes[found]!.seconds * 1000,
            );
            serial++;
          } else {
            resetVisit();
          }
        }
        // Expired/removed content and schedule changes must apply even while offline.
        const frame = current()?.frame;
        const validContent =
          !frame ||
          frame.kind === "widget" ||
          (frame.kind === "event"
            ? ctx.content.eventBanners.some(
                (b) => b.submissionId === frame.banner.submissionId,
              )
            : frame.kind === "story"
              ? frame.stories.every((s) =>
                  ctx.content.stories.some(
                    (b) => b.submissionId === s.submissionId,
                  ),
                )
              : frame.kind === "spotlight"
                ? ctx.posters.some((p) => p.id === frame.poster.id)
                : frame.kind === "wall"
                  ? frame.posters.every((p) =>
                      ctx.posters.some((b) => b.id === p.id),
                    )
                  : frame.focusIndex < ctx.posters.length);
        if (
          !current() ||
          (!widget &&
            (!block ||
              !block.enabled ||
              !isScheduleActive(block.schedule, now) ||
              changed ||
              !validContent))
        ) {
          nextBlock(ctx, now);
        } else {
          remaining -= paused ? 0 : Math.max(0, elapsedMs);
          if (remaining <= 0 || pendingNext) advance(ctx, now);
        }
        pendingNext = false;
      }
      if (!paused || quiet) sourceSignature = sources;
      const scene = quiet ? undefined : current();
      const blocks = ctx.lineup.blocks;
      const currentBlockIndex = blocks.findIndex((b) => b.id === blockId);
      const nextBlockForLabel = Array.from(
        { length: blocks.length },
        (_, i) => blocks[(currentBlockIndex + 1 + i) % blocks.length]!,
      ).find(
        (b) =>
          b.enabled &&
          isScheduleActive(b.schedule, now) &&
          (b.source === "PROGRAM"
            ? !!ctx.lineup.programs[b.programId ?? ""]
            : b.submissionType === "POSTER"
              ? ctx.posters.length > 0
              : b.submissionType === "EVENT_BANNER"
                ? ctx.content.eventBanners.length > 0
                : ctx.content.stories.length > 0),
      );
      const nextKind = !widget && visit?.scenes[index + 1]?.frame.kind;
      let upcomingLabel = nextKind
        ? nextKind === "event"
          ? "이벤트 배너"
          : nextKind === "story"
            ? "소식 제보"
            : "포스터"
        : nextBlockForLabel?.submissionType
          ? LINEUP_LABELS[nextBlockForLabel.submissionType]
          : (ctx.lineup.programs[nextBlockForLabel?.programId ?? ""]?.name ??
            null);
      if (!nextKind && !widget && visit) {
        const ratio = Math.min(0.5, Math.max(0, ctx.widgetRatio / 100));
        const credit = Math.min(
          300,
          widgetCredit +
            (visit.scenes.reduce((sum, s) => sum + s.seconds, 0) * ratio) /
              (1 - ratio),
        );
        const pick = ctx.peekWidget?.();
        if (pick && pick.slot.durationSeconds <= credit)
          upcomingLabel = WIDGET_LABELS[pick.slot.type];
      }
      return {
        currentFrame: scene?.frame,
        frameSeconds: scene?.seconds ?? 10,
        frameIndex: index,
        frameCount: visit?.scenes.length ?? 0,
        serial,
        moving: !!scene && !paused,
        quiet,
        blockId: widget || quiet ? null : blockId,
        upcomingLabel,
      };
    },
  };
}
