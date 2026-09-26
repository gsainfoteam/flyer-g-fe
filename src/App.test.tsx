import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderRoute } from "@/test/render-route";

/**
 * 화면이 fixture가 아니라 repository 경계를 통해 데이터를 읽는지 확인한다.
 * (Phase 00 인수 조건 "App.tsx가 도메인 fixture와 비즈니스 계산을 직접 소유하지 않는다")
 */
describe("대시보드", () => {
  it("주입한 repository의 상태별 건수를 보여준다", async () => {
    renderRoute("/", { role: "REVIEWER" });

    const counts = await screen.findByRole("group", { name: "상태별 건수" });
    for (const label of ["승인 대기", "게시 중", "예약됨", "종료됨"]) {
      expect(within(counts).getByText(label)).toBeInTheDocument();
    }
  });

  it("통계의 기준 시각을 함께 표시한다", async () => {
    renderRoute("/", { role: "REVIEWER" });
    // 2026-06-08T03:00Z == 2026. 06. 08. 12:00 KST
    expect(
      await screen.findByText(/2026\. 06\. 08\. 12:00 · 서버 시각 기준/),
    ).toBeInTheDocument();
  });

  it("의미가 불명확한 조회수와 증감률을 보여주지 않는다", async () => {
    renderRoute("/", { role: "REVIEWER" });
    await screen.findByRole("group", { name: "상태별 건수" });

    expect(screen.queryByText(/총 조회수/)).not.toBeInTheDocument();
    expect(screen.queryByText(/지난 7일 대비/)).not.toBeInTheDocument();
  });

  it("대시보드에서 바로 승인하지 않고 검토 상세로 보낸다", async () => {
    renderRoute("/", { role: "REVIEWER" });
    await screen.findByRole("heading", { name: "오래 기다린 순" });

    // 근거 없이 누르는 원클릭 승인 버튼은 두지 않는다. (명세 FR-REV-02)
    expect(
      screen.queryByRole("button", { name: "승인하기" }),
    ).not.toBeInTheDocument();
    const reviewLinks = screen.getAllByRole("link", { name: "검토" });
    expect(reviewLinks.length).toBeGreaterThan(0);
    expect(reviewLinks[0]!.getAttribute("href")).toMatch(/^\/reviews\//);
  });

  it("상태 배지 옆에 지금 상황을 설명하는 문장을 함께 둔다", async () => {
    renderRoute("/", { role: "SUBMITTER" });
    await screen.findByRole("heading", { name: "내 신청" });

    expect(
      (await screen.findAllByText(/TV에 나오고 있어요/)).length,
    ).toBeGreaterThan(0);
  });

  it("역할에 따라 첫 문장이 달라진다", async () => {
    const reviewer = renderRoute("/", { role: "REVIEWER" });
    expect(
      await screen.findByRole("heading", { name: /검토를 기다리는 신청/ }),
    ).toBeInTheDocument();
    reviewer.unmount();

    renderRoute("/", { role: "SUBMITTER" });
    expect(
      await screen.findByRole("heading", { name: /고쳐야 할 신청이/ }),
    ).toBeInTheDocument();
  });
});
