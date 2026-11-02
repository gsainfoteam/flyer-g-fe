import { describe, expect, it } from "vitest";
import { SUBMISSION_KINDS } from "@/entities/submission/model/kind";
import { REJECTION_REASON_CODES, rejectionReasonsFor } from "./types";

describe("rejectionReasonsFor", () => {
  it("제보에는 해상도·비율 대신 개인정보·비방·광고 사유를 고른다", () => {
    const story = rejectionReasonsFor("STORY");
    expect(story).toEqual(
      expect.arrayContaining(["PERSONAL_INFO", "DEFAMATION", "ADVERTISEMENT"]),
    );
    expect(story).not.toContain("LOW_RESOLUTION");
    expect(story).not.toContain("ASPECT_RATIO");
  });

  it("포스터 사유는 예전 그대로다", () => {
    expect(rejectionReasonsFor("POSTER")).toEqual([
      "LOW_RESOLUTION",
      "ASPECT_RATIO",
      "INFO_MISMATCH",
      "INAPPROPRIATE",
      "PERIOD",
      "DUPLICATE",
      "OTHER",
    ]);
  });

  it("모든 종류가 서버가 아는 사유만 쓰고, 기타로 끝난다", () => {
    for (const kind of SUBMISSION_KINDS) {
      const reasons = rejectionReasonsFor(kind);
      for (const code of reasons)
        expect(REJECTION_REASON_CODES).toContain(code);
      expect(reasons.at(-1)).toBe("OTHER");
    }
  });
});
