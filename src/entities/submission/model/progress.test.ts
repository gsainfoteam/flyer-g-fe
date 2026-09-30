import { describe, expect, it } from "vitest";
import { SUBMISSION_STATUSES } from "./types";
import { getProgressSteps } from "./progress";

describe("getProgressSteps", () => {
  it("모든 상태가 다섯 단계이고, 지금 단계나 멈춘 단계가 정확히 하나다", () => {
    for (const status of SUBMISSION_STATUSES) {
      const steps = getProgressSteps(status);
      expect(steps).toHaveLength(5);
      expect(
        steps.filter(
          (step) => step.state === "current" || step.state === "problem",
        ),
      ).toHaveLength(1);
    }
  });

  it("검토 대기는 검토 단계에, 게시 중은 게시 단계에 있다", () => {
    expect(
      getProgressSteps("PENDING_REVIEW").find(
        (step) => step.state === "current",
      )?.label,
    ).toBe("검토 중");
    expect(
      getProgressSteps("PUBLISHED").find((step) => step.state === "current")
        ?.label,
    ).toBe("게시 중");
  });

  it("반려와 중단은 멈춘 단계의 이름을 바꿔 알린다", () => {
    expect(getProgressSteps("REJECTED")[1]).toEqual({
      label: "반려",
      state: "problem",
    });
    expect(getProgressSteps("SUSPENDED")[3]).toEqual({
      label: "중단",
      state: "problem",
    });
  });
});
