import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { createMockRepositories } from "@/mocks/repositories";
import { createFixedClock } from "@/shared/lib/clock";
import { TEST_NOW, renderRoute } from "@/test/render-route";

/**
 * 검토 상세 (명세 FR-REV-02 ~ FR-REV-05).
 * mock fixture: notice-003은 PENDING_REVIEW다.
 */
const PENDING_ID = "notice-003";

function reviewRepositories() {
  return createMockRepositories({ clock: createFixedClock(TEST_NOW) });
}

describe("검토 상세", () => {
  it("검토 근거를 한 화면에 보여준다", async () => {
    renderRoute(`/reviews/${PENDING_ID}`, { role: "REVIEWER" });

    // 페이지 제목과 TV 미리보기가 같은 제목을 그린다. 하나 이상 있으면 된다.
    expect(
      await screen.findAllByRole("heading", {
        name: "지스트신문 22기 기자단 모집",
      }),
    ).not.toHaveLength(0);
    expect(screen.getByText(/검토 버전 v1/)).toBeInTheDocument();
    expect(screen.getByText("원본 포스터")).toBeInTheDocument();
    expect(screen.getByText("TV 미리보기")).toBeInTheDocument();
    expect(screen.getByText("처리 이력")).toBeInTheDocument();

    const original = screen.getByRole("link", { name: /새 창에서 확인/ });
    expect(original).toHaveAttribute("target", "_blank");
    expect(original.getAttribute("rel")).toContain("noreferrer");
  });

  it("승인하면 서버 응답 상태가 화면에 반영된다", async () => {
    const user = userEvent.setup();
    const repositories = reviewRepositories();
    renderRoute(`/reviews/${PENDING_ID}`, {
      role: "REVIEWER",
      repositories,
    });

    await user.click(await screen.findByRole("button", { name: "승인" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/검토 버전 v1/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "승인" }));

    await waitFor(async () => {
      const detail = await repositories.submissions.getById(PENDING_ID);
      // 시작 시각이 미래(2일 뒤)라 서버가 SCHEDULED로 정한다.
      expect(detail.status).toBe("SCHEDULED");
    });
    expect(await screen.findByText("예약됨")).toBeInTheDocument();
  });

  it("반려는 분류와 사유 없이 실행되지 않는다", async () => {
    const user = userEvent.setup();
    const repositories = reviewRepositories();
    renderRoute(`/reviews/${PENDING_ID}`, {
      role: "REVIEWER",
      repositories,
    });

    await user.click(await screen.findByRole("button", { name: "반려" }));
    const dialog = await screen.findByRole("dialog");

    const confirm = within(dialog).getByRole("button", { name: "반려" });
    expect(confirm).toBeDisabled();

    await user.click(within(dialog).getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "정보 불일치" }));
    expect(confirm).toBeDisabled();

    await user.type(
      within(dialog).getByRole("textbox"),
      "포스터 마감일이 공지와 다릅니다.",
    );
    expect(confirm).toBeEnabled();
    await user.click(confirm);

    await waitFor(async () => {
      const detail = await repositories.submissions.getById(PENDING_ID);
      expect(detail.status).toBe("REJECTED");
    });

    // 반려 사유가 처리 이력에 나타난다.
    expect(await screen.findByText(/반려 · 하우스 관리자/)).toBeInTheDocument();
    expect(
      screen.getByText(/포스터 마감일이 공지와 다릅니다/),
    ).toBeInTheDocument();
  });

  it("다른 관리자가 먼저 처리한 409에서 성공을 표시하지 않는다", async () => {
    const user = userEvent.setup();
    const repositories = reviewRepositories();

    renderRoute(`/reviews/${PENDING_ID}`, {
      role: "REVIEWER",
      repositories,
    });
    await screen.findByRole("button", { name: "승인" });

    // 화면이 열린 사이 다른 관리자가 처리한다.
    const current = await repositories.submissions.getById(PENDING_ID);
    await repositories.reviews.approve({
      submissionId: PENDING_ID,
      revision: current.version,
    });

    await user.click(screen.getByRole("button", { name: "승인" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "승인" }));

    // 실패를 알리고 dialog는 성공한 것처럼 닫히지 않는다.
    expect(await screen.findByText("승인하지 못했어요")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    // 서버 상태는 먼저 처리한 결정이 유지된다.
    const detail = await repositories.submissions.getById(PENDING_ID);
    expect(detail.status).not.toBe("PENDING_REVIEW");
  });

  it("게시 중인 건은 사유와 함께 중단할 수 있다", async () => {
    const user = userEvent.setup();
    const repositories = reviewRepositories();
    // fixture notice-001은 PUBLISHED다.
    renderRoute("/reviews/notice-001", { role: "REVIEWER", repositories });

    await user.click(
      await screen.findByRole("button", { name: "게시 중단" }),
    );
    const dialog = await screen.findByRole("dialog");
    const confirm = within(dialog).getByRole("button", { name: "게시 중단" });
    expect(confirm).toBeDisabled();

    await user.type(
      within(dialog).getByRole("textbox"),
      "행사가 취소되어 내립니다.",
    );
    await user.click(confirm);

    await waitFor(async () => {
      const detail = await repositories.submissions.getById("notice-001");
      expect(detail.status).toBe("SUSPENDED");
    });
  });

  it("게시자 역할은 검토 상세에 접근할 수 없다", async () => {
    renderRoute(`/reviews/${PENDING_ID}`, { role: "SUBMITTER" });

    expect(
      await screen.findByText("이 화면을 볼 권한이 없어요"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "승인" })).toBeNull();
  });
});
