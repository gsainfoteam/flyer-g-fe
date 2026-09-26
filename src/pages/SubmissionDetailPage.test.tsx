import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderRoute } from "@/test/render-route";

/**
 * 신청 상세 (명세 FR-SUB-05).
 *
 * mock fixture 기준:
 * - notice-901: REJECTED, 반려 사유 있음
 * - notice-903: SUSPENDED, 중단 사유 있음
 */
describe("신청 상세", () => {
  it("상태·기간·버전과 처리 이력을 보여준다", async () => {
    renderRoute("/submissions/notice-901", { role: "SUBMITTER" });

    expect(
      await screen.findByRole("heading", { name: "슈퍼-피셜 신입 부원 모집" }),
    ).toBeInTheDocument();
    expect(screen.getByText("반려됨")).toBeInTheDocument();
    expect(screen.getByText("게시 기간")).toBeInTheDocument();
    // 처음 낸 일이 처리 이력의 시작이다.
    expect(screen.getByText("신청 · 정하윤")).toBeInTheDocument();
  });

  it("반려 사유가 게시자에게 보인다", async () => {
    renderRoute("/submissions/notice-901", { role: "SUBMITTER" });

    await screen.findByText("처리 이력");
    expect(screen.getByText(/반려 · 이수현/)).toBeInTheDocument();
    expect(screen.getByText(/정보 불일치/)).toBeInTheDocument();
    expect(
      screen.getByText(/마감일이 다릅니다/),
    ).toBeInTheDocument();
  });

  it("중단 사유가 게시자에게 보인다", async () => {
    renderRoute("/submissions/notice-903", { role: "SUBMITTER" });

    await screen.findByText("처리 이력");
    expect(screen.getByText(/게시 중단 · 이수현/)).toBeInTheDocument();
    expect(screen.getByText(/안내를 잠시 내립니다/)).toBeInTheDocument();
  });

  it("Ziggle 원문 링크가 새 창과 안전한 rel로 열린다", async () => {
    renderRoute("/submissions/notice-901", { role: "SUBMITTER" });

    const link = await screen.findByRole("link", { name: /원문 보기/ });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link.getAttribute("rel")).toContain("noreferrer");
  });

  it("없는 신청은 찾을 수 없음을 알린다", async () => {
    renderRoute("/submissions/no-such-id", { role: "SUBMITTER" });

    const alert = await screen.findByRole("alert");
    expect(
      within(alert).getByText(/요청한 내용을 찾을 수 없습니다/),
    ).toBeInTheDocument();
  });

  it("관리자가 남의 신청을 열면 게시자 버튼 대신 검토 화면으로 안내한다", async () => {
    renderRoute("/submissions/notice-003", { role: "REVIEWER" });

    expect(
      await screen.findByRole("link", { name: "검토 화면에서 보기" }),
    ).toHaveAttribute("href", "/reviews/notice-003");
    expect(screen.queryByRole("button", { name: "신청 취소하기" })).toBeNull();
  });

  it("게시자 화면에 내부 식별자를 드러내지 않는다", async () => {
    renderRoute("/submissions/notice-901", { role: "SUBMITTER" });
    await screen.findByText("게시 정보");

    expect(screen.queryByText("신청 ID")).toBeNull();
    expect(screen.queryByText("신청 버전")).toBeNull();
  });
});

