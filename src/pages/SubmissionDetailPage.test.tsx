import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createMockRepositories } from "@/mocks/repositories";
import { MOCK_USERS } from "@/mocks/users";
import { createFixedClock } from "@/shared/lib/clock";
import { TEST_NOW, renderRoute } from "@/test/render-route";

/**
 * 신청 상세 (명세 FR-SUB-05).
 *
 * mock fixture 기준:
 * - notice-901: REJECTED, 반려 사유 있음
 * - notice-903: SUSPENDED, 중단 사유 있음
 */
describe("신청 상세", () => {
  it("상태·기간과 진행 기록을 보여준다", async () => {
    renderRoute("/mine/notice-901", { role: "SUBMITTER" });

    // TV 미리보기도 제목을 그리므로 화면 제목(h1)으로 찾는다.
    expect(
      await screen.findByRole("heading", {
        name: "슈퍼-피셜 신입 부원 모집",
        level: 1,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("기간")).toBeInTheDocument();
    // 처음 낸 일이 처리 이력의 시작이다.
    expect(screen.getByText("신청 · 정하윤")).toBeInTheDocument();
  });

  it("반려 사유를 맨 위에 두고 진행 기록에도 남긴다", async () => {
    renderRoute("/mine/notice-901", { role: "SUBMITTER" });

    const reason = (
      await screen.findByRole("heading", { name: "반려 · 정보 불일치" })
    ).closest("section")!;
    expect(within(reason).getByText(/마감일이 다릅니다/)).toBeInTheDocument();
    expect(within(reason).getByText(/이수현/)).toBeInTheDocument();

    const progress = screen
      .getByRole("heading", { name: "진행" })
      .closest("section")!;
    expect(within(progress).getByText(/반려 · 이수현/)).toBeInTheDocument();
  });

  it("중단 사유가 게시자에게 보인다", async () => {
    renderRoute("/mine/notice-903", { role: "SUBMITTER" });

    const reason = (
      await screen.findByRole("heading", { name: "게시 중단", level: 2 })
    ).closest("section")!;
    expect(within(reason).getByText(/안내를 잠시 내립니다/)).toBeInTheDocument();
  });

  it("Ziggle 원문 링크가 새 창과 안전한 rel로 열린다", async () => {
    renderRoute("/mine/notice-901", { role: "SUBMITTER" });

    const info = (
      await screen.findByRole("heading", { name: "신청 내용" })
    ).closest("section")!;
    const link = within(info).getByRole("link", { name: /ziggle\.gistory\.me/ });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link.getAttribute("rel")).toContain("noreferrer");
  });

  it("없는 신청은 찾을 수 없음을 알린다", async () => {
    renderRoute("/mine/no-such-id", { role: "SUBMITTER" });

    const alert = await screen.findByRole("alert");
    expect(
      within(alert).getByText(/요청한 내용을 찾을 수 없습니다/),
    ).toBeInTheDocument();
  });

  it("관리자가 남의 신청을 열면 게시자 버튼 대신 검토 화면으로 안내한다", async () => {
    renderRoute("/mine/notice-003", { role: "REVIEWER" });

    expect(
      await screen.findByRole("link", { name: "심사 화면에서 보기" }),
    ).toHaveAttribute("href", "/review/notice-003");
    expect(screen.queryByRole("button", { name: "신청 취소" })).toBeNull();
  });

  it("관리자가 자기 신청을 열면 수정·취소와 함께 검토 화면으로 갈 수 있다", async () => {
    const repositories = createMockRepositories({
      clock: createFixedClock(TEST_NOW),
      session: () => MOCK_USERS.REVIEWER,
    });
    const own = await repositories.submissions.create({
      title: "관리자가 낸 공지",
      categoryId: "performance",
      assetId: "asset-own",
      detailUrl: null,
      organizerName: null,
      subtitle: null,
      location: null,
      description: null,
      startAt: new Date(TEST_NOW.getTime() + 2 * 86_400_000),
      endAt: new Date(TEST_NOW.getTime() + 5 * 86_400_000),
      targetGroupIds: [],
    });
    renderRoute(`/mine/${own.id}`, { role: "REVIEWER", repositories });

    expect(
      await screen.findByRole("link", { name: "심사 화면에서 보기" }),
    ).toHaveAttribute("href", `/review/${own.id}`);
    expect(screen.getByRole("link", { name: "고치기" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "신청 취소" }),
    ).toBeInTheDocument();
  });

  it("게시자 화면에 내부 식별자를 드러내지 않는다", async () => {
    renderRoute("/mine/notice-901", { role: "SUBMITTER" });
    await screen.findByRole("heading", { name: "신청 내용" });

    expect(screen.queryByText("신청 ID")).toBeNull();
    expect(screen.queryByText("신청 버전")).toBeNull();
  });
});
