import type { PosterRenderModel } from "@/entities/poster";
import { exposedPosters } from "@/entities/poster/model/frames";
import type { PlayerFrame } from "./schedule";
import { isGameWidget } from "./types";

/** 종료한 게임·게시 기간 밖 콘텐츠는 뒤로/앞으로 탐색해도 되살리지 않는다. */
export function isReplayableFrame(frame: PlayerFrame, posters: PosterRenderModel[], now: Date) {
  const active = (start: Date | null, end: Date | null) =>
    start !== null && end !== null && start <= now && now < end;
  if (frame.kind === "widget") return !isGameWidget(frame.slot.type);
  if (frame.kind === "event") return active(frame.banner.startsAt, frame.banner.endsAt);
  if (frame.kind === "story") return frame.stories.every((s) => active(s.startsAt, s.endsAt));
  const items = exposedPosters(frame, posters);
  return items.length > 0 && items.every((p) => active(p.startAt, p.endAt));
}
