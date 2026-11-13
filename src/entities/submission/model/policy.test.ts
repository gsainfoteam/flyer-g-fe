import { describe, expect, it } from "vitest";
import { checkSchedule } from "./policy";

describe("포스터 게시 기간", () => {
  it.each([
    ["일반", "2026-06-10T09:00:00+09:00", "2026-07-10T09:00:00+09:00"],
    ["월말", "2026-01-31T23:59:00+09:00", "2026-03-02T23:59:00+09:00"],
    ["윤년 2월", "2028-01-31T09:00:00+09:00", "2028-03-01T09:00:00+09:00"],
    ["윤일 시작", "2028-02-29T09:00:00+09:00", "2028-03-30T09:00:00+09:00"],
    ["연말", "2026-12-31T09:00:00+09:00", "2027-01-30T09:00:00+09:00"],
  ])("%s에도 정확히 30일은 허용하고 1밀리초 초과하면 거절한다", (_, start, end) => {
    const startAt = new Date(start);
    const endAt = new Date(end);
    const config = { maxPublishDays: 30 };

    expect(checkSchedule(startAt, endAt, startAt, config)).toEqual({});
    expect(
      checkSchedule(startAt, new Date(endAt.getTime() + 1), startAt, config),
    ).toEqual({ endAt: "게시 기간은 최대 30일입니다." });
  });

  it("달력 한 달이어도 31일이면 거절한다", () => {
    const startAt = new Date("2026-07-01T09:00:00+09:00");
    expect(
      checkSchedule(startAt, new Date("2026-08-01T09:00:00+09:00"), startAt, {
        maxPublishDays: 30,
      }),
    ).toEqual({ endAt: "게시 기간은 최대 30일입니다." });
  });

  it.each([7, 45])("서버 설정이 %i일이면 해당 시간 차이로 제한한다", (maxPublishDays) => {
    const startAt = new Date("2026-06-10T09:00:00+09:00");
    const endAt = new Date(startAt.getTime() + maxPublishDays * 86_400_000);
    expect(checkSchedule(startAt, endAt, startAt, { maxPublishDays })).toEqual({});
    expect(
      checkSchedule(startAt, new Date(endAt.getTime() + 1), startAt, { maxPublishDays }),
    ).toEqual({ endAt: `게시 기간은 최대 ${maxPublishDays}일입니다.` });
  });
});
