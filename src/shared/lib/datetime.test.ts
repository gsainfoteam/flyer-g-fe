import { describe, expect, it } from "vitest";
import {
  InvalidDateError,
  formatElapsed,
  formatSeoulDate,
  formatSeoulDateTime,
  formatSeoulDateWithWeekday,
  formatSeoulPeriod,
  formatTimeAgo,
  fromSeoulInput,
  getSeoulParts,
  parseIsoUtc,
  toIsoUtc,
  toSeoulDateInputValue,
  toSeoulDateTimeInputValue,
} from "./datetime";

describe("parseIsoUtc", () => {
  it("ISO 8601 UTC 문자열을 Date로 해석한다", () => {
    expect(toIsoUtc(parseIsoUtc("2026-06-08T03:00:00.000Z"))).toBe(
      "2026-06-08T03:00:00.000Z",
    );
  });

  it("잘못된 값은 조용히 통과시키지 않는다", () => {
    expect(() => parseIsoUtc("어제")).toThrow(InvalidDateError);
  });
});

describe("Asia/Seoul 표시", () => {
  // 2026-06-08T03:00Z == 2026-06-08 12:00 KST (월)
  const noonKst = parseIsoUtc("2026-06-08T03:00:00.000Z");

  it("UTC 시각을 Seoul 벽시계로 분해한다", () => {
    expect(getSeoulParts(noonKst)).toEqual({
      year: 2026,
      month: 6,
      day: 8,
      weekday: "월",
      hour24: 12,
      hour12: 12,
      minute: 0,
      meridiem: "PM",
    });
  });

  it("자정을 넘기는 UTC 시각도 Seoul 날짜로 옮긴다", () => {
    // 2026-06-07T15:00Z == 2026-06-08 00:00 KST
    const midnight = parseIsoUtc("2026-06-07T15:00:00.000Z");
    expect(formatSeoulDate(midnight)).toBe("2026. 06. 08.");
    expect(getSeoulParts(midnight).hour24).toBe(0);
    expect(getSeoulParts(midnight).hour12).toBe(12);
    expect(getSeoulParts(midnight).meridiem).toBe("AM");
  });

  it("날짜, 요일, 시각, 기간 문구를 만든다", () => {
    expect(formatSeoulDate(noonKst)).toBe("2026. 06. 08.");
    expect(formatSeoulDateWithWeekday(noonKst)).toBe("2026. 06. 08. (월)");
    expect(formatSeoulDateTime(noonKst)).toBe("2026. 06. 08. 12:00");
    expect(
      formatSeoulPeriod(noonKst, parseIsoUtc("2026-06-15T03:00:00.000Z")),
    ).toBe("2026. 06. 08. ~ 2026. 06. 15.");
  });

  it("input 요소가 쓰는 Seoul 기준 값으로 바꾼다", () => {
    expect(toSeoulDateInputValue(noonKst)).toBe("2026-06-08");
    expect(toSeoulDateTimeInputValue(noonKst)).toBe("2026-06-08T12:00");
  });
});

describe("fromSeoulInput", () => {
  it("Seoul 벽시계 입력을 UTC로 되돌린다", () => {
    expect(toIsoUtc(fromSeoulInput("2026-06-08T12:00"))).toBe(
      "2026-06-08T03:00:00.000Z",
    );
  });

  it("날짜만 입력하면 그날 Seoul 자정으로 본다", () => {
    expect(toIsoUtc(fromSeoulInput("2026-06-08"))).toBe(
      "2026-06-07T15:00:00.000Z",
    );
  });

  it("표시 값과 입력 값이 왕복한다", () => {
    const original = parseIsoUtc("2026-06-08T03:00:00.000Z");
    expect(toIsoUtc(fromSeoulInput(toSeoulDateTimeInputValue(original)))).toBe(
      toIsoUtc(original),
    );
  });
});

describe("formatTimeAgo", () => {
  const now = parseIsoUtc("2026-06-08T03:00:00.000Z");
  const ago = (ms: number) => new Date(now.getTime() - ms);

  it("1분 안은 방금, 그 뒤로는 분·시간·일 단위로 읽는다", () => {
    expect(formatTimeAgo(ago(12_000), now)).toBe("방금");
    expect(formatTimeAgo(ago(26 * 60_000), now)).toBe("26분 전");
    expect(formatTimeAgo(ago(3 * 3_600_000), now)).toBe("3시간 전");
    expect(formatTimeAgo(ago(2 * 86_400_000), now)).toBe("2일 전");
  });

  it("기준보다 미래 시각도 방금으로 본다", () => {
    expect(formatTimeAgo(new Date(now.getTime() + 5_000), now)).toBe("방금");
  });
});

describe("formatElapsed", () => {
  const now = parseIsoUtc("2026-06-08T03:00:00.000Z");

  it("1분이 안 돼도 0분이라고 하지 않는다", () => {
    expect(formatElapsed(new Date(now.getTime() - 20_000), now)).toBe("1분");
  });

  it("분·시간·일 단위로 읽는다", () => {
    expect(formatElapsed(new Date(now.getTime() - 5 * 60_000), now)).toBe("5분");
    expect(formatElapsed(new Date(now.getTime() - 3 * 3_600_000), now)).toBe("3시간");
    expect(formatElapsed(new Date(now.getTime() - 2 * 86_400_000), now)).toBe("2일");
  });
});

