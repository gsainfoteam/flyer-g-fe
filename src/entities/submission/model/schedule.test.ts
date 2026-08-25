import { describe, expect, it } from "vitest";
import { parseIsoUtc } from "@/shared/lib/datetime";
import {
  isDisplayable,
  resolveEffectiveStatus,
  selectDisplayable,
} from "./schedule";
import type { SchedulableSubmission } from "./schedule";
import type { SubmissionStatus } from "./types";

const START = parseIsoUtc("2026-06-08T00:00:00.000Z");
const END = parseIsoUtc("2026-06-15T00:00:00.000Z");

function item(status: SubmissionStatus): SchedulableSubmission {
  return { status, startAt: START, endAt: END };
}

describe("isDisplayable", () => {
  const during = parseIsoUtc("2026-06-10T00:00:00.000Z");

  it("승인 계열이면서 기간 안이면 노출한다", () => {
    expect(isDisplayable(item("PUBLISHED"), during)).toBe(true);
    expect(isDisplayable(item("APPROVED"), during)).toBe(true);
    expect(isDisplayable(item("SCHEDULED"), during)).toBe(true);
  });

  it("상태가 PUBLISHED여도 시작 전이면 노출하지 않는다", () => {
    expect(
      isDisplayable(item("PUBLISHED"), parseIsoUtc("2026-06-07T23:59:59.000Z")),
    ).toBe(false);
  });

  it("종료 시각에 도달하면 승인 여부와 무관하게 노출하지 않는다", () => {
    expect(isDisplayable(item("PUBLISHED"), END)).toBe(false);
    expect(isDisplayable(item("APPROVED"), END)).toBe(false);
  });

  it("시작 시각 경계는 포함하고 종료 시각 경계는 제외한다", () => {
    expect(isDisplayable(item("PUBLISHED"), START)).toBe(true);
    expect(
      isDisplayable(item("PUBLISHED"), new Date(END.getTime() - 1)),
    ).toBe(true);
  });

  it("중단·취소·반려·대기·종료 건은 기간 안이어도 노출하지 않는다", () => {
    for (const status of [
      "SUSPENDED",
      "CANCELED",
      "REJECTED",
      "PENDING_REVIEW",
      "DRAFT",
      "ENDED",
      "ARCHIVED",
    ] as const) {
      expect(isDisplayable(item(status), during)).toBe(false);
    }
  });
});

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
});

describe("selectDisplayable", () => {
  it("노출 가능한 항목만 남긴다", () => {
    const now = parseIsoUtc("2026-06-10T00:00:00.000Z");
    const items = [item("PUBLISHED"), item("SUSPENDED"), item("PENDING_REVIEW")];
    expect(selectDisplayable(items, now)).toHaveLength(1);
  });

  it("모두 만료되면 빈 배열을 준다", () => {
    expect(
      selectDisplayable([item("PUBLISHED")], parseIsoUtc("2026-07-01T00:00:00.000Z")),
    ).toEqual([]);
  });
});
