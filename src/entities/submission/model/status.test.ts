import { describe, expect, it } from "vitest";
import {
  canTransition,
  getAllowedTransitions,
  getStatusLabel,
  getStatusMeta,
} from "./status";
import { SUBMISSION_STATUSES } from "./types";

describe("상태 표시 매핑", () => {
  it("모든 상태에 label, tone, 설명이 있다", () => {
    for (const status of SUBMISSION_STATUSES) {
      const meta = getStatusMeta(status);
      expect(meta.label.length).toBeGreaterThan(0);
      expect(meta.description.length).toBeGreaterThan(0);
      expect(meta.tone).toBeTruthy();
    }
  });

  it("색 없이 문구만으로 상태를 구분할 수 있다", () => {
    const labels = SUBMISSION_STATUSES.map(getStatusLabel);
    expect(new Set(labels).size).toBe(SUBMISSION_STATUSES.length);
  });

  it("명세 6.3의 UI 표시 문구를 쓴다", () => {
    expect(getStatusLabel("PENDING_REVIEW")).toBe("승인 대기");
    expect(getStatusLabel("SUSPENDED")).toBe("게시 중단");
    expect(getStatusMeta("PUBLISHED").tone).toBe("success");
    expect(getStatusMeta("REJECTED").tone).toBe("danger");
  });
});

describe("허용 전이", () => {
  it("명세 6.3의 전이만 허용한다", () => {
    expect(canTransition("PENDING_REVIEW", "APPROVED")).toBe(true);
    expect(canTransition("PENDING_REVIEW", "PUBLISHED")).toBe(false);
    expect(canTransition("PUBLISHED", "SUSPENDED")).toBe(true);
    expect(canTransition("PUBLISHED", "CANCELED")).toBe(false);
    expect(canTransition("ENDED", "ARCHIVED")).toBe(true);
  });

  it("종료 상태에서는 더 나아가지 않는다", () => {
    expect(getAllowedTransitions("CANCELED")).toEqual([]);
    expect(getAllowedTransitions("ARCHIVED")).toEqual([]);
  });
});
