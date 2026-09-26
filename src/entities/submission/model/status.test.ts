import { describe, expect, it } from "vitest";
import {
  canReviewerDecide,
  canReviewerSuspend,
  canSubmitterCancel,
  canSubmitterEdit,
  canTransition,
  getAllowedTransitions,
  getStatusLabel,
  getStatusMeta,
} from "./status";
import { SUBMISSION_STATUSES } from "./types";
import type { SubmissionStatus } from "./types";

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
  });

  it("tone이 상태의 의미 축을 따른다", () => {
    expect(getStatusMeta("REJECTED").tone).toBe("attention");
    expect(getStatusMeta("SUSPENDED").tone).toBe("attention");
    expect(getStatusMeta("PUBLISHED").tone).toBe("positive");
    expect(getStatusMeta("SCHEDULED").tone).toBe("info");
    expect(getStatusMeta("PENDING_REVIEW").tone).toBe("pending");
    expect(getStatusMeta("ENDED").tone).toBe("neutral");
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

describe("상태별 가능한 행동 (명세 6.3 허용 전이)", () => {
  const cases: [SubmissionStatus, { edit: boolean; cancel: boolean; decide: boolean; suspend: boolean }][] = [
    ["DRAFT", { edit: true, cancel: false, decide: false, suspend: false }],
    ["PENDING_REVIEW", { edit: false, cancel: true, decide: true, suspend: false }],
    ["REJECTED", { edit: true, cancel: true, decide: false, suspend: false }],
    ["APPROVED", { edit: false, cancel: false, decide: false, suspend: true }],
    ["SCHEDULED", { edit: false, cancel: true, decide: false, suspend: true }],
    ["PUBLISHED", { edit: false, cancel: false, decide: false, suspend: true }],
    ["ENDED", { edit: false, cancel: false, decide: false, suspend: false }],
    ["SUSPENDED", { edit: true, cancel: false, decide: false, suspend: false }],
    ["CANCELED", { edit: false, cancel: false, decide: false, suspend: false }],
  ];

  it.each(cases)("%s", (status, expected) => {
    expect({
      edit: canSubmitterEdit(status),
      cancel: canSubmitterCancel(status),
      decide: canReviewerDecide(status),
      suspend: canReviewerSuspend(status),
    }).toEqual(expected);
  });
});

