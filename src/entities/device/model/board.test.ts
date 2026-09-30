import { describe, expect, it } from "vitest";
import { boardRotationOf, isRenderStalled, isTargetedTo } from "./board";

const single = { layout: { type: "SINGLE" as const, rotationSeconds: 10 } };
const grid = { layout: { type: "FOUR_GRID" as const, rotationSeconds: 10 } };

describe("boardRotationOf", () => {
  it("한 장씩이면 장수만큼 넘기고, 한 장이 한 시간에 몇 번 나오는지 센다", () => {
    expect(boardRotationOf(single, 9)).toMatchObject({
      cycleSeconds: 90,
      timesPerHour: 40,
    });
  });

  it("4분할은 네 장씩 한 화면이라 한 바퀴가 짧다", () => {
    expect(boardRotationOf(grid, 9)).toMatchObject({
      perScreen: 4,
      cycleSeconds: 30,
      timesPerHour: 120,
    });
  });

  it("한 화면에 다 들어가면 넘기지 않는다", () => {
    expect(boardRotationOf(grid, 3)).toMatchObject({
      cycleSeconds: null,
      timesPerHour: null,
    });
    expect(boardRotationOf(single, 1).cycleSeconds).toBeNull();
    expect(boardRotationOf(single, 0).cycleSeconds).toBeNull();
  });

  it("서버가 보낸 전환 간격은 안전 범위로 맞춰 센다", () => {
    expect(
      boardRotationOf({ layout: { type: "SINGLE", rotationSeconds: 1 } }, 2)
        .rotationSeconds,
    ).toBe(5);
  });
});

describe("isTargetedTo", () => {
  it("대상 위치가 비어 있으면 모든 기기, 아니면 겹치는 기기만 받는다", () => {
    const device = { groupIds: ["group-a"] };
    expect(isTargetedTo(device, [])).toBe(true);
    expect(isTargetedTo(device, ["group-a", "group-b"])).toBe(true);
    expect(isTargetedTo(device, ["group-b"])).toBe(false);
  });
});

describe("isRenderStalled", () => {
  const now = new Date("2026-09-30T03:00:00.000Z");
  const ago = (minutes: number) => new Date(now.getTime() - minutes * 60_000);

  it("연결은 됐는데 10분 넘게 정상 재생이 없으면 멈춘 것이다", () => {
    expect(
      isRenderStalled(
        { status: "ONLINE", lastRenderOkAt: ago(11) },
        now,
        true,
      ),
    ).toBe(true);
    expect(
      isRenderStalled({ status: "ONLINE", lastRenderOkAt: ago(2) }, now, true),
    ).toBe(false);
  });

  it("띄울 포스터가 없거나, 끊겼거나, 재생 기록이 아직 없으면 멈춤으로 보지 않는다", () => {
    expect(
      isRenderStalled(
        { status: "ONLINE", lastRenderOkAt: ago(30) },
        now,
        false,
      ),
    ).toBe(false);
    expect(
      isRenderStalled(
        { status: "OFFLINE", lastRenderOkAt: ago(30) },
        now,
        true,
      ),
    ).toBe(false);
    expect(
      isRenderStalled({ status: "ONLINE", lastRenderOkAt: null }, now, true),
    ).toBe(false);
  });
});
