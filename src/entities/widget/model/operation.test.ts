import { describe, expect, it } from "vitest";
import { buildWidgetContent } from "./content";
import { operationWidgets, standaloneWidgets } from "./feed";
import { WIDGET_DURATIONS } from "./operation";

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
