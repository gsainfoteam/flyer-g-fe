import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { createMockRepositories } from "@/mocks/repositories";
import { createFixedClock } from "@/shared/lib/clock";
import { TEST_NOW, renderRoute } from "@/test/render-route";

/**
 * 시작 전 취소 (명세 FR-DASH-02).
 * mock fixture: notice-901은 REJECTED(취소 가능), notice-903은 SUSPENDED(불가),
 * notice-905는 PENDING_REVIEW(수정·취소 가능).
 */
describe("신청 취소", () => {
  it("취소 확인 후 상태가 신청 취소로 바뀐다", async () => {
    const user = userEvent.setup();
    const repositories = createMockRepositories({
      clock: createFixedClock(TEST_NOW),
    });
    renderRoute("/submissions/notice-901", {
      role: "SUBMITTER",
      repositories,
    });

    await user.click(
      await screen.findByRole("button", { name: "신청 취소하기" }),
    );
    await user.click(
      within(await screen.findByRole("dialog")).getByRole("button", {
        name: "신청 취소",
      }),
    );

    // dialog가 닫히고 상세 상태가 갱신된다.
    await waitFor(async () => {
      const detail = await repositories.submissions.getById("notice-901");
      expect(detail.status).toBe("CANCELED");
    });
    expect(await screen.findByText("신청 취소")).toBeInTheDocument();
  });

  it("게시 중단된 신청은 취소도 재신청도 없이 관리자 문의를 안내한다", async () => {
    // 중단 건의 재검토는 백엔드에 요청해 둔 상태다(API-FOLLOWUP 1-1).
    renderRoute("/submissions/notice-903", { role: "SUBMITTER" });

    await screen.findByText("처리 이력");
    expect(screen.queryByRole("button", { name: "신청 취소하기" })).toBeNull();
    expect(screen.queryByRole("link", { name: /다시 신청|수정/ })).toBeNull();
    expect(screen.getByText(/하우스 관리자에게 문의/)).toBeInTheDocument();
  });

  it("승인 대기 중인 신청은 고치거나 취소할 수 있다", async () => {
    renderRoute("/submissions/notice-905", { role: "SUBMITTER" });

    expect(
      await screen.findByRole("link", { name: "수정하기" }),
    ).toHaveAttribute("href", "/studio?submissionId=notice-905");
    expect(
      screen.getByRole("button", { name: "신청 취소하기" }),
    ).toBeInTheDocument();
  });

  it("게시 중인 신청은 게시자가 직접 내리거나 고치지 못한다", async () => {
    renderRoute("/submissions/notice-001", { role: "SUBMITTER" });

    await screen.findByText("처리 이력");
    expect(screen.queryByRole("button", { name: "신청 취소하기" })).toBeNull();
    expect(screen.queryByRole("link", { name: /다시 신청/ })).toBeNull();
    expect(screen.getByText(/게시 중단을 요청해 주세요/)).toBeInTheDocument();
  });

  it("반려된 신청에서 수정 재신청 링크가 스튜디오 수정 모드로 간다", async () => {
    renderRoute("/submissions/notice-901", { role: "SUBMITTER" });

    const link = await screen.findByRole("link", {
      name: "수정해서 다시 신청",
    });
    expect(link).toHaveAttribute("href", "/studio?submissionId=notice-901");
  });
});
