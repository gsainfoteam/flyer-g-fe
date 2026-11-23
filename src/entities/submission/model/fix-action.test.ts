import { describe, expect, it } from "vitest";
import { fixActionOf } from "./fix-action";

describe("반려·중단된 신청을 고치러 가는 길", () => {
  it.each([
    ["POSTER", "REJECTED", "고쳐서 다시 내기", "/new/poster?submissionId=s1"],
    ["POSTER", "SUSPENDED", "고쳐서 다시 내기", "/new/poster?submissionId=s1"],
    ["EVENT_BANNER", "REJECTED", "고쳐서 다시 내기", "/new/event?submissionId=s1"],
    ["STORY", "REJECTED", "새로 쓰기", "/new/story"],
  ] as const)("%s %s → %s", (type, status, label, href) => {
    expect(fixActionOf({ id: "s1", type, status })).toEqual({ label, href });
  });

  it.each(["PENDING_REVIEW", "PUBLISHED", "ENDED", "DRAFT"] as const)(
    "%s는 고칠 일이 없다",
    (status) => {
      expect(fixActionOf({ id: "s1", type: "POSTER", status })).toBeNull();
    },
  );
});
