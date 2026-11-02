import { describe, expect, it } from "vitest";
import { buildWidgetContent } from "./content";
import { operationWidgets, standaloneWidgets } from "./feed";
import { WIDGET_DURATIONS, isWidgetReleased } from "./operation";

describe("위젯 공개일", () => {
  it("셔플보드는 11/5부터 평소 순환에 들어가고, 공개일이 없는 위젯은 늘 들어간다", () => {
    expect(isWidgetReleased("SHUFFLEBOARD", "2026-11-04")).toBe(false);
    expect(isWidgetReleased("SHUFFLEBOARD", "2026-11-05")).toBe(true);
    expect(isWidgetReleased("CLICK_BATTLE", "2026-11-01")).toBe(true);
    // 준비 중(null)은 언제든 순환에 넣지 않는다.
    expect(isWidgetReleased("FLYER_DODGE", "2099-01-01")).toBe(false);
  });
});

describe("운영 설정 위젯", () => {
  it("기본 위젯은 운영 설정의 시간을 쓴다", () => {
    for (const slot of standaloneWidgets()) {
      const configured = WIDGET_DURATIONS[slot.type];
      if (configured) expect(slot.durationSeconds).toBe(configured);
    }
  });

  it("상시 위젯(설문)은 한 바퀴가 길어도 들어가고, 짧으면 기본 위젯과 함께 들어간다", () => {
    expect(operationWidgets(false).map((slot) => slot.type)).toEqual(["SURVEY"]);
    const short = operationWidgets(true).map((slot) => slot.type);
    expect(short).toContain("SURVEY");
    expect(short).toContain("FORTUNE");
    expect(new Set(short).size).toBe(short.length);
  });
});

describe("설문 위젯", () => {
  const slot = (params: Record<string, unknown>) => ({
    id: "s",
    type: "SURVEY" as const,
    durationSeconds: 15,
    params,
  });
  const now = new Date("2026-11-02T03:00:00Z");

  it("http(s) 링크가 있을 때만 나온다", () => {
    expect(buildWidgetContent(slot({ url: "" }), now)).toBeNull();
    expect(buildWidgetContent(slot({ url: "javascript:alert(1)" }), now)).toBeNull();
    expect(
      buildWidgetContent(slot({ url: "https://forms.gle/abc", title: "설문", description: " " }), now),
    ).toEqual({ type: "SURVEY", url: "https://forms.gle/abc", title: "설문", description: null });
  });
});

describe("mock 위젯 피드의 설문", () => {
  it("기본 설정으로 만든 피드에서도 설문 위젯이 내용을 갖는다", async () => {
    const { createMockRepositories } = await import("@/mocks/repositories");
    const { createFixedClock } = await import("@/shared/lib/clock");
    const now = new Date("2026-11-02T03:00:00Z");
    const repositories = createMockRepositories({ clock: createFixedClock(now) });
    const feed = await repositories.widgets.getDeviceWidgets("device-preview");
    const survey = feed.widgets.find((slot) => slot.type === "SURVEY");
    expect(survey).toBeDefined();
    expect(buildWidgetContent(survey!, now)).toMatchObject({ type: "SURVEY" });
  });
});
