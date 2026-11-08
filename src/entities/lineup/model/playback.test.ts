import { describe, expect, it } from "vitest";
import type {
  PlaylistEventBanner,
  PlaylistStory,
} from "@/entities/playlist/model/types";
import type { PosterRenderModel } from "@/entities/poster";
import { buildVisit, createLineupPlayer } from "./playback";
import type { PlaybackContext } from "./playback";
import { DEFAULT_LINEUP_SETTINGS, newSubmissionBlock } from "./types";
import type { LineupBlock, LineupSubmissionType } from "./types";
import { isQuietAt, isScheduleActive } from "./schedule";

const now = new Date("2026-11-04T03:00:00Z");
const common = (id: string) => ({
  submissionId: id,
  revision: 1,
  startsAt: new Date("2026-11-01T00:00:00Z"),
  endsAt: new Date("2026-11-10T00:00:00Z"),
  checksum: id,
});
const banner = (id: string): PlaylistEventBanner => ({
  ...common(id),
  mode: "TEMPLATE",
  occasion: "BIRTHDAY",
  recipient: id,
  headline: "축하합니다",
  message: null,
  sender: null,
  photoUrl: null,
  assetUrl: null,
});
const story = (id: string): PlaylistStory => ({
  ...common(id),
  storyNumber: 1,
  tag: "PRAISE",
  body: id,
});
const poster = (id: string): PosterRenderModel => ({
  id,
  title: id,
  subtitle: null,
  organizerName: null,
  location: null,
  categoryName: "공지",
  detailUrl: null,
  posterUrl: `/${id}.png`,
  width: 1080,
  height: 1920,
  startAt: now,
  endAt: now,
});
const block = (type: LineupSubmissionType, id = type): LineupBlock => ({
  ...newSubmissionBlock(type),
  id,
});
const context = (blocks: LineupBlock[]): PlaybackContext => ({
  lineup: { settings: { ...DEFAULT_LINEUP_SETTINGS }, blocks, programs: {} },
  posters: [],
  content: {
    eventBanners: [banner("e1"), banner("e2"), banner("e3")],
    stories: [story("s1"), story("s2"), story("s3")],
  },
  canHostGame: false,
  widgetRatio: 0,
});
const eventId = (
  state: ReturnType<ReturnType<typeof createLineupPlayer>["tick"]>,
) =>
  state.currentFrame?.kind === "event"
    ? state.currentFrame.banner.submissionId
    : null;

describe("편성 재생", () => {
  it("블록 경계를 넘어 뒤로 탐색하고 앞으로 돌아오면 커서와 자동 순환을 이어 간다", () => {
    const ctx = context([block("EVENT_BANNER"), block("STORY")]);
    const player = createLineupPlayer();
    expect(eventId(player.tick(ctx, now, 0))).toBe("e1");
    player.requestPrevious();
    expect(eventId(player.tick(ctx, now, 0, true))).toBe("e1");
    player.requestAdvance(); player.tick(ctx, now, 0, true); // story s1,s2
    player.requestAdvance();
    expect(eventId(player.tick(ctx, now, 0, true))).toBe("e2");
    player.requestPrevious();
    expect(player.tick(ctx, now, 0, true).currentFrame).toMatchObject({ kind: "story", stories: [{ submissionId: "s1" }, { submissionId: "s2" }] });
    player.requestPrevious();
    expect(eventId(player.tick(ctx, now, 0, true))).toBe("e1");
    player.requestAdvance(); player.tick(ctx, now, 0, true);
    player.requestAdvance();
    expect(eventId(player.tick(ctx, now, 0, true))).toBe("e2");
    expect(player.cursors).toEqual({ EVENT_BANNER: "e1", STORY: "s2" });
    expect(player.tick(ctx, now, 15_000).currentFrame).toMatchObject({ kind: "story", stories: [{ submissionId: "s3" }, { submissionId: "s1" }] });
  });

  it("이력의 게시 기간·삭제·블록 일정을 다시 확인한다", () => {
    const ctx = context([block("EVENT_BANNER"), block("STORY")]);
    const player = createLineupPlayer();
    player.tick(ctx, now, 0);
    player.requestAdvance(); player.tick(ctx, now, 0, true);
    player.requestAdvance(); player.tick(ctx, now, 0, true);
    ctx.lineup.blocks[1]!.enabled = false;
    ctx.content.eventBanners = ctx.content.eventBanners.filter((b) => b.submissionId !== "e1");
    player.requestPrevious();
    expect(eventId(player.tick(ctx, now, 0, true))).toBe("e2");

    const expired = context([block("EVENT_BANNER")]);
    expired.content.eventBanners[0]!.endsAt = new Date(now.getTime() + 1000);
    const other = createLineupPlayer();
    other.tick(expired, now, 0);
    other.requestAdvance(); other.tick(expired, now, 0, true);
    other.requestPrevious();
    expect(eventId(other.tick(expired, new Date(now.getTime() + 1000), 0, true))).toBe("e2");
  });

  it("이전과 다음 탐색에서 이미 떠난 게임을 건너뛴다", () => {
    const ctx = context([block("EVENT_BANNER")]);
    ctx.widgetRatio = 50;
    const game = { slot: { id: "game", type: "CLICK_BATTLE" as const, durationSeconds: 10, params: {} }, content: { type: "CLICK_BATTLE" as const } };
    ctx.peekWidget = () => game;
    ctx.pickWidget = () => game;
    const player = createLineupPlayer();
    player.tick(ctx, now, 0);
    player.requestAdvance();
    expect(player.tick(ctx, now, 0, true).currentFrame?.kind).toBe("widget");
    player.requestAdvance();
    expect(eventId(player.tick(ctx, now, 0, true))).toBe("e2");
    player.requestPrevious();
    expect(eventId(player.tick(ctx, now, 0, true))).toBe("e1");
    player.requestAdvance();
    expect(eventId(player.tick(ctx, now, 0, true))).toBe("e2");
  });

  it("설정한 블록 시간과 순서대로 일부씩 보여주며 다음 바퀴에 다음 내용을 고른다", () => {
    const ctx = context([block("EVENT_BANNER"), block("STORY")]);
    const player = createLineupPlayer();
    expect(eventId(player.tick(ctx, now, 0))).toBe("e1");
    expect(eventId(player.tick(ctx, now, 14_999))).toBe("e1");
    const stories = player.tick(ctx, now, 1);
    expect(stories.currentFrame).toMatchObject({
      kind: "story",
      stories: [{ submissionId: "s1" }, { submissionId: "s2" }],
    });
    expect(stories.frameSeconds).toBe(20);
    expect(eventId(player.tick(ctx, now, 20_000))).toBe("e2");
    expect(player.cursors).toEqual({ EVENT_BANNER: "e1", STORY: "s2" });
    const restarted = createLineupPlayer(player.cursors);
    expect(eventId(restarted.tick(ctx, now, 0))).toBe("e2");
  });
  it("건수가 늘어도 한 방문의 길이는 같고 같은 항목을 한 방문에 중복하지 않는다", () => {
    const ctx = context([block("EVENT_BANNER")]);
    ctx.content.eventBanners = Array.from({ length: 50 }, (_, i) =>
      banner(String(i)),
    );
    const visit = buildVisit(ctx.lineup.blocks[0]!, ctx, now);
    expect(visit.scenes).toHaveLength(1);
    expect(visit.scenes[0]?.seconds).toBe(15);
    ctx.content.eventBanners = [banner("only")];
    expect(
      buildVisit({ ...ctx.lineup.blocks[0]!, perVisit: 10 }, ctx, now).scenes,
    ).toHaveLength(1);
  });
  it("제보는 두 건씩 묶고 읽는 시간·영상 길이보다 짧게 잘라내지 않는다", () => {
    const ctx = context([block("STORY")]);
    const visit = buildVisit(
      { ...block("STORY"), perVisit: 3, durationSeconds: 5 },
      ctx,
      now,
    );
    expect(visit.scenes.map((s) => s.seconds)).toEqual([15, 15]);
    ctx.posters = [
      { ...poster("video"), videoUrl: "/video.mp4", durationMs: 45000 },
    ];
    expect(
      buildVisit({ ...block("POSTER"), durationSeconds: 5 }, ctx, now).scenes[0]
        ?.seconds,
    ).toBe(45);
  });
  it("흐르는 띠는 전체 포스터 목록의 올바른 위치를 가리킨다", () => {
    const ctx = context([block("POSTER")]);
    ctx.lineup.settings.posterLayout = "STRIP";
    ctx.posters = [poster("p1"), poster("p2"), poster("p3"), poster("p4")];
    const visit = buildVisit(
      { ...block("POSTER"), perVisit: 2 },
      ctx,
      now,
      "p2",
    );
    expect(visit.scenes.map((s) => s.frame)).toMatchObject([
      { kind: "strip", focusIndex: 2 },
      { kind: "strip", focusIndex: 3 },
    ]);
  });
  it("빈 블록·꺼진 블록·시간대 밖 블록은 건너뛰고 모두 비면 대기한다", () => {
    const ctx = context([
      block("POSTER"),
      { ...block("EVENT_BANNER"), enabled: false },
      {
        ...block("STORY"),
        schedule: {
          type: "DATE_RANGE",
          from: "2027-01-01T00:00:00Z",
          to: "2027-02-01T00:00:00Z",
        },
      },
    ]);
    const player = createLineupPlayer();
    expect(player.tick(ctx, now, 0).currentFrame).toBeUndefined();
    ctx.lineup.blocks[1]!.enabled = true;
    expect(eventId(player.tick(ctx, now, 250))).toBe("e1");
    ctx.lineup.blocks = [];
    expect(player.tick(ctx, now, 250).currentFrame).toBeUndefined();
  });
  it("일시정지 중 시간을 소모하지 않고 수동 넘김은 작동한다", () => {
    const ctx = context([block("EVENT_BANNER")]);
    const player = createLineupPlayer();
    player.tick(ctx, now, 0);
    expect(eventId(player.tick(ctx, now, 100_000, true))).toBe("e1");
    player.requestAdvance();
    expect(eventId(player.tick(ctx, now, 0, true))).toBe("e2");
  });
  it("위젯은 실제 블록 시간으로 적립한 비율만큼 삽입하고 짧은 포스터 채우기를 하지 않는다", () => {
    const ctx = context([block("EVENT_BANNER")]);
    const pick = {
      slot: {
        id: "w",
        type: "CLICK_BATTLE" as const,
        durationSeconds: 10,
        params: {},
      },
      content: { type: "CLICK_BATTLE" as const },
    };
    ctx.widgetRatio = 25;
    ctx.peekWidget = () => pick;
    ctx.pickWidget = () => pick;
    const player = createLineupPlayer();
    player.tick(ctx, now, 0);
    expect(eventId(player.tick(ctx, now, 15_000))).toBe("e2");
    expect(player.tick(ctx, now, 15_000).currentFrame?.kind).toBe("widget");
    expect(eventId(player.tick(ctx, now, 10_000))).toBe("e3");
  });
  it("화면 끄기는 오프라인 시각으로 판정하고 끝나면 다시 돈다", () => {
    const ctx = context([block("EVENT_BANNER")]);
    ctx.lineup.settings.quietHours = [{ start: "12:00", end: "13:00" }];
    const player = createLineupPlayer();
    expect(player.tick(ctx, now, 0)).toMatchObject({
      quiet: true,
      currentFrame: undefined,
    });
    expect(
      player.tick(ctx, new Date("2026-11-04T04:00:00Z"), 250).currentFrame
        ?.kind,
    ).toBe("event");
  });
  it("운영 콘텐츠 날짜를 서울 시각으로 읽고 모르는 종류는 건너뛴다", () => {
    const b: LineupBlock = {
      ...block("POSTER"),
      source: "PROGRAM",
      submissionType: null,
      perVisit: null,
      programId: "dday",
    };
    const ctx = context([b]);
    ctx.lineup.programs.dday = {
      type: "DDAY",
      name: "시험",
      params: { label: "시험", date: "2026-11-05" },
      data: null,
    };
    expect(buildVisit(b, ctx, now).scenes[0]?.frame).toMatchObject({
      kind: "widget",
      content: { type: "DDAY", days: 1 },
    });
    ctx.lineup.programs.dday.type = "UNKNOWN";
    expect(buildVisit(b, ctx, now).scenes).toEqual([]);
  });
});

describe("서울 시간대", () => {
  const schedule = {
    type: "WINDOWS" as const,
    windows: [{ days: [1], start: "22:00", end: "06:00" }],
  };
  it("월요일 밤에서 화요일 새벽으로 이어지며 종료 시각은 제외한다", () => {
    expect(
      isScheduleActive(schedule, new Date("2026-11-02T22:00:00+09:00")),
    ).toBe(true);
    expect(
      isScheduleActive(schedule, new Date("2026-11-03T05:59:00+09:00")),
    ).toBe(true);
    expect(
      isScheduleActive(schedule, new Date("2026-11-03T06:00:00+09:00")),
    ).toBe(false);
    expect(
      isScheduleActive(schedule, new Date("2026-11-02T05:59:00+09:00")),
    ).toBe(false);
    expect(
      isQuietAt(
        [{ start: "22:00", end: "06:00" }],
        new Date("2026-11-03T05:59:00+09:00"),
      ),
    ).toBe(true);
  });
});
