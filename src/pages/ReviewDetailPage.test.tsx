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

  it("승인하면 서버가 정한 상태로 바뀌고 다음 대기 건으로 넘어간다", async () => {
    const user = userEvent.setup();
    const repositories = reviewRepositories();
    const { router } = renderRoute(`/reviews/${PENDING_ID}`, {
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
    // 가장 오래 기다린 다음 건(fixture notice-005)으로 이어진다.
    await waitFor(() =>
      expect(router.state.location.pathname).toBe("/reviews/notice-005"),
    );
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

    // 반려 사유가 처리 이력에 남는다.
    const history = await repositories.reviews.listHistory(PENDING_ID);
    expect(history.at(-1)).toMatchObject({
      type: "REJECTED",
      actorName: "이수현",
      comment: "포스터 마감일이 공지와 다릅니다.",
    });
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

    // 성공처럼 보이지 않게 실패를 알리고, 같은 409를 반복하지 않게 닫는다.
    expect(await screen.findByText("승인하지 못했어요")).toBeInTheDocument();
    expect(
      screen.getByText(/다른 관리자가 먼저 처리했어요/),
    ).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    // 화면이 최신 상태로 바뀌어 더는 승인 버튼이 없다.
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "승인" })).toBeNull(),
    );
    expect(screen.getAllByText("예약됨").length).toBeGreaterThan(0);
  });

  it("게시 중인 건은 사유와 함께 중단할 수 있다", async () => {
    const user = userEvent.setup();
    const repositories = reviewRepositories();
    // fixture notice-001은 PUBLISHED다.
    renderRoute("/reviews/notice-001", { role: "REVIEWER", repositories });

    await user.click(
      await screen.findByRole("button", { name: "게시 중단하기" }),
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

  it("대상 위치를 신청에 지정된 위치 이름으로 보여준다", async () => {
    renderRoute(`/reviews/${PENDING_ID}`, { role: "REVIEWER" });

    const label = await screen.findByText("대상 위치");
    expect(label.nextElementSibling).toHaveTextContent("학사기숙사 A동");
  });

  it("기타로 반려하려면 무엇이 문제인지 10자 이상 적어야 한다", async () => {
    const user = userEvent.setup();
    renderRoute(`/reviews/${PENDING_ID}`, { role: "REVIEWER" });

    await user.click(await screen.findByRole("button", { name: "반려" }));
    const dialog = await screen.findByRole("dialog");
    const confirm = within(dialog).getByRole("button", { name: "반려" });

    await user.click(within(dialog).getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "기타" }));
    await user.type(within(dialog).getByRole("textbox"), "별로예요");
    expect(confirm).toBeDisabled();

    await user.type(within(dialog).getByRole("textbox"), " 포스터 글씨가 안 보여요");
    expect(confirm).toBeEnabled();
  });

  it("승인 대기가 아닌 건에서는 전체 신청 목록으로 돌아간다", async () => {
    renderRoute("/reviews/notice-001", { role: "REVIEWER" });

    expect(
      await screen.findByRole("link", { name: /전체 신청으로/ }),
    ).toHaveAttribute("href", "/submissions?scope=all");
  });
});

