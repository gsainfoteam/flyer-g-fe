import { describe, expect, it } from "vitest";
import { parseIsoUtc } from "@/shared/lib/datetime";
import { resolveEffectiveStatus } from "./schedule";
import type { SchedulableSubmission } from "./schedule";
import type { SubmissionStatus } from "./types";

const START = parseIsoUtc("2026-06-08T00:00:00.000Z");
const END = parseIsoUtc("2026-06-15T00:00:00.000Z");

function item(status: SubmissionStatus): SchedulableSubmission {
  return { status, startAt: START, endAt: END };
}

describe("resolveEffectiveStatus", () => {
  it("승인 계열은 기준 시각으로 다시 판정한다", () => {
    expect(
      resolveEffectiveStatus(item("APPROVED"), parseIsoUtc("2026-06-01T00:00:00.000Z")),
    ).toBe("SCHEDULED");
    expect(
      resolveEffectiveStatus(item("SCHEDULED"), parseIsoUtc("2026-06-10T00:00:00.000Z")),
    ).toBe("PUBLISHED");
    expect(
      resolveEffectiveStatus(item("PUBLISHED"), parseIsoUtc("2026-06-20T00:00:00.000Z")),
    ).toBe("ENDED");
  });

  it("승인 계열이 아닌 상태는 서버 상태를 그대로 존중한다", () => {
    const now = parseIsoUtc("2026-06-20T00:00:00.000Z");
    expect(resolveEffectiveStatus(item("SUSPENDED"), now)).toBe("SUSPENDED");
    expect(resolveEffectiveStatus(item("PENDING_REVIEW"), now)).toBe(
      "PENDING_REVIEW",
    );
  });

  it("시작 시각은 게시 중에 포함하고 종료 시각은 종료로 본다", () => {
    expect(resolveEffectiveStatus(item("APPROVED"), START)).toBe("PUBLISHED");
    expect(resolveEffectiveStatus(item("APPROVED"), END)).toBe("ENDED");
  });
});
