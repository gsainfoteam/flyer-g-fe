import { describe, expect, it } from "vitest";
import { mockContents } from "@/data/mockContents";
import { toIsoUtc } from "@/shared/lib/datetime";
import { toSignageSubmissionExpandedDto } from "./legacy";
import { toSignageSubmissionExpanded, toSubmissionView } from "./mapper";
import { SUBMISSION_STATUSES } from "./types";

describe("기존 목 데이터를 새 모델로 변환", () => {
  const converted = mockContents.map(toSignageSubmissionExpandedDto);

  it("모든 항목이 새 상태 모델의 값을 가진다", () => {
    for (const dto of converted) {
      expect(SUBMISSION_STATUSES).toContain(dto.status);
    }
  });

  it("구 Ziggle 주소를 공식 주소로 옮긴다", () => {
    for (const dto of converted) {
      expect(dto.detailUrl.startsWith("https://ziggle.gistory.me/")).toBe(true);
    }
  });

  it("날짜를 Seoul 입력으로 읽어 UTC로 저장한다", () => {
    const first = converted[0]!;
    // Seoul 자정으로 읽으므로 저장 값은 전날 15:00Z가 된다.
    const seoulMidnight = `${mockContents[0]!.startDate}T00:00`;
    expect(first.startAt).toBe(
      new Date(`${seoulMidnight}+09:00`).toISOString(),
    );
    expect(new Date(first.endAt).getTime()).toBeGreaterThan(
      new Date(first.startAt).getTime(),
    );
  });

  it("종료일이 없으면 최대 게시 기간으로 보정한다", () => {
    const withoutEnd = mockContents.find((content) => !content.endDate);
    if (!withoutEnd) return;
    const dto = toSignageSubmissionExpandedDto(withoutEnd);
    const days =
      (new Date(dto.endAt).getTime() - new Date(dto.startAt).getTime()) /
      (24 * 60 * 60 * 1000);
    expect(days).toBeLessThanOrEqual(14);
  });

  it("표시 모델로 이어서 변환된다", () => {
    const now = new Date("2026-06-08T03:00:00.000Z");
    const view = toSubmissionView(
      toSignageSubmissionExpanded(converted[0]!),
      now,
    );
    expect(view.title).toBe(mockContents[0]!.title);
    expect(view.categoryName).toBe(mockContents[0]!.category);
    expect(view.organizationName).toBe(mockContents[0]!.organizer);
    expect(toIsoUtc(view.startAt)).toBe(converted[0]!.startAt);
  });

  it("의미가 불명확한 조회수를 옮기지 않는다", () => {
    for (const dto of converted) {
      expect(Object.keys(dto)).not.toContain("views");
      expect(Object.keys(dto)).not.toContain("likes");
    }
  });
});
