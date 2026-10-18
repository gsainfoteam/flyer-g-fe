import { describe, expect, it } from "vitest";
import { boardRotationOf, isRenderStalled, isTargetedTo } from "./board";

const wall = { layout: { type: "WALL" as const, rotationSeconds: 10 } };
const strip = { layout: { type: "STRIP" as const, rotationSeconds: 10 } };

describe("boardRotationOf", () => {
  it("흐르는 띠는 장수만큼 넘기고, 한 장이 한 시간에 몇 번 가운데 오는지 센다", () => {
    expect(boardRotationOf(strip, 9)).toMatchObject({
      cycleSeconds: 90,
      timesPerHour: 40,
    });
  });

  it("모아 보기는 크게 세 건마다 벽이 한 번 끼어 한 바퀴가 그만큼 길다", () => {
    // 벽 3번 + 크게 9번
    expect(boardRotationOf(wall, 9)).toMatchObject({
      cycleSeconds: 120,
      timesPerHour: 30,
    });
  });

  it("한 건뿐이면 넘기지 않는다", () => {
    expect(boardRotationOf(wall, 1)).toMatchObject({
      cycleSeconds: null,
      timesPerHour: null,
    });
    expect(boardRotationOf(strip, 1).cycleSeconds).toBeNull();
    expect(boardRotationOf(strip, 0).cycleSeconds).toBeNull();
  });

  it("서버가 보낸 전환 간격은 안전 범위로 맞춰 센다", () => {
    expect(
      boardRotationOf({ layout: { type: "STRIP", rotationSeconds: 1 } }, 2)
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
      isRenderStalled({ status: "ONLINE", lastRenderOkAt: ago(11) }, now, true),
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
