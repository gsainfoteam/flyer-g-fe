import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { currentPath, renderRoute } from "@/test/render-route";

/** 승인 대기 목록 (명세 FR-REV-01) */
describe("승인 대기 목록", () => {
  it("오래 기다린 순으로 보여주고 검토 상세로 연결한다", async () => {
    renderRoute("/reviews", { role: "REVIEWER" });

    expect(await screen.findByText(/승인 대기 \d+건/)).toBeInTheDocument();

    const reviewLinks = screen.getAllByRole("link", { name: "검토" });
    expect(reviewLinks.length).toBeGreaterThan(0);
    expect(reviewLinks[0]!.getAttribute("href")).toMatch(/^\/reviews\//);

    // 가장 오래 기다린 건이 위에 온다.
    const waits = screen
      .getAllByText(/\d+(분|시간|일) 대기/)
      .map((el) => el.textContent ?? "");
    expect(waits.length).toBeGreaterThan(1);
  });

  it("누가 올렸는지와 주최를 함께 보여준다", async () => {
    renderRoute("/reviews", { role: "REVIEWER" });
    await screen.findByText(/승인 대기 \d+건/);

    // notice-003: 최기자가 지스트신문 이름으로 올린 동아리 신청
    expect(
      screen.getByText(/최기자 · 지스트신문 · 동아리/),
    ).toBeInTheDocument();
  });

  it("카테고리 필터는 서버가 거르고 URL에 남는다", async () => {
    const user = userEvent.setup();
    const { router } = renderRoute("/reviews", { role: "REVIEWER" });
    await screen.findByText(/승인 대기 \d+건/);
    const before = screen.getAllByRole("link", { name: "검토" }).length;

    await user.click(screen.getByRole("combobox", { name: "카테고리 필터" }));
    await user.click(await screen.findByRole("option", { name: "동아리" }));

    expect(currentPath(router)).toBe("/reviews?category=club");
    await screen.findByText("승인 대기 1건");
    const links = screen.getAllByRole("link", { name: "검토" });
    expect(links.length).toBeLessThan(before);
    expect(links[0]).toHaveAttribute("href", "/reviews/notice-003");
  });

  it("조건에 맞는 건이 없으면 필터 안내를 보여준다", async () => {
    renderRoute("/reviews?category=performance", { role: "REVIEWER" });

    expect(
      await screen.findByText("조건에 맞는 대기 건이 없어요"),
    ).toBeInTheDocument();
    expect(screen.getByText(/필터를 넓혀 보세요/)).toBeInTheDocument();
  });
});
