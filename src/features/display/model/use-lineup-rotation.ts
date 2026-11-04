import { useCallback, useEffect, useRef, useState } from "react";
import {
  createLineupPlayer,
  EMPTY_LINEUP_SNAPSHOT,
} from "@/entities/lineup/model/playback";
import type { PlaybackContext } from "@/entities/lineup/model/playback";

export function useLineupRotation(
  deviceId: string,
  context: PlaybackContext | null,
  serverTime: Date | null,
  paused: boolean,
) {
  const [snapshot, setSnapshot] = useState(EMPTY_LINEUP_SNAPSHOT);
  const player = useRef<ReturnType<typeof createLineupPlayer> | null>(null);
  const latest = useRef({ context, paused, offset: 0 });
  useEffect(() => {
    latest.current.context = context;
    latest.current.paused = paused;
  }, [context, paused]);
  useEffect(() => {
    latest.current.offset = serverTime ? serverTime.getTime() - Date.now() : 0;
  }, [serverTime]);
  const enabled = context !== null && serverTime !== null;
  useEffect(() => {
    if (!enabled) return;
    const key = `flyer-g:lineup-cursors:${deviceId}`;
    let cursors: Record<string, string> = {};
    try {
      const raw: unknown = JSON.parse(localStorage.getItem(key) ?? "{}");
      if (raw && typeof raw === "object" && !Array.isArray(raw)) {
        cursors = Object.fromEntries(
          Object.entries(raw).filter(
            (entry): entry is [string, string] => typeof entry[1] === "string",
          ),
        );
      }
    } catch {
      /* Storage is optional on kiosk browsers. */
    }
    const engine = createLineupPlayer(cursors);
    player.current = engine;
    let previous = Date.now();
    let saved = JSON.stringify(cursors);
    const update = () => {
      const { context: ctx, paused: hold, offset } = latest.current;
      if (!ctx) return;
      const now = Date.now();
      const next = engine.tick(
        ctx,
        new Date(now + offset),
        now - previous,
        hold,
      );
      previous = now;
      setSnapshot((old) =>
        old.serial === next.serial &&
        old.moving === next.moving &&
        old.quiet === next.quiet &&
        old.upcomingLabel === next.upcomingLabel &&
        old.currentFrame === next.currentFrame
          ? old
          : next,
      );
      const activeIds = new Set(ctx.lineup.blocks.map((b) => b.id));
      const json = JSON.stringify(
        Object.fromEntries(
          Object.entries(engine.cursors).filter(([id]) => activeIds.has(id)),
        ),
      );
      if (saved !== json) {
        saved = json;
        try {
          localStorage.setItem(key, json);
        } catch {
          /* Playback continues without persistence. */
        }
      }
    };
    update();
    const timer = window.setInterval(update, 250);
    return () => {
      window.clearInterval(timer);
      player.current = null;
    };
  }, [deviceId, enabled]);
  const advance = useCallback(() => player.current?.requestAdvance(), []);
  return {
    ...snapshot,
    advance,
    nextFrame: undefined,
    upcoming: undefined,
    currentPickId: undefined,
  };
}
