import { describe, expect, it } from "vitest";
import { canSubmitterSuspend } from "./status";
import { SUBMISSION_STATUSES } from "./types";

const now = new Date("2026-11-04T00:00:00Z");
const submission = {
  requesterId: "owner", type: "STORY" as const, status: "PUBLISHED" as const,
  endAt: new Date(now.getTime() + 1),
};

describe("작성자 중단 노출 조건", () => {
  it.each(SUBMISSION_STATUSES)("%s 상태의 허용 여부", (status) => {
    expect(canSubmitterSuspend({ ...submission, status }, "owner", now))
      .toBe(["APPROVED", "SCHEDULED", "PUBLISHED"].includes(status));
  });
  it("본인 제보·이벤트만 허용한다", () => {
    expect(canSubmitterSuspend(submission, "other", now)).toBe(false);
    expect(canSubmitterSuspend({ ...submission, requesterId: null }, "owner", now)).toBe(false);
    expect(canSubmitterSuspend({ ...submission, type: "POSTER" }, "owner", now)).toBe(false);
    expect(canSubmitterSuspend({ ...submission, type: "EVENT_BANNER" }, "owner", now)).toBe(true);
  });
  it("종료 시각과 같거나 지났거나 시각이 없으면 숨긴다", () => {
    expect(canSubmitterSuspend(submission, "owner", now)).toBe(true);
    expect(canSubmitterSuspend(submission, "owner", submission.endAt)).toBe(false);
    expect(canSubmitterSuspend(submission, "owner", new Date(submission.endAt.getTime() + 1))).toBe(false);
    expect(canSubmitterSuspend(submission, "owner", null)).toBe(false);
    expect(canSubmitterSuspend({ ...submission, endAt: null }, "owner", now)).toBe(false);
  });
});
