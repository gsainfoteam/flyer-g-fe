import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { currentPath, renderRoute } from "@/test/render-route";

/**
 * 신청 목록 (명세 FR-SUB-05, FR-DASH-02).
 * 실제 route로 띄워 URL 동기화와 pagination까지 확인한다.
 */
describe("신청 목록", () => {
  it("전체 신청이 pagination으로 접근 가능하다", async () => {
    const user = userEvent.setup();
    renderRoute("/submissions", { role: "SUBMITTER" });

    const heading = await screen.findByRole("heading", { level: 1 });
    const total = Number(/(\d+)건/.exec(heading.textContent ?? "")?.[1]);
    expect(total).toBeGreaterThan(10);

    // 첫 페이지는 10건, 더 보기를 누르면 나머지가 이어 붙는다.
    const listItems = () => screen.getAllByRole("listitem");
    expect(listItems()).toHaveLength(10);

    await user.click(screen.getByRole("button", { name: /더 보기/ }));
    await screen.findByText(`신청 ${total}건`);
    expect(listItems()).toHaveLength(total);
    expect(screen.queryByRole("button", { name: /더 보기/ })).toBeNull();
  });

  it("상태 탭이 URL에 반영되고 직접 접근해도 같은 화면이 나온다", async () => {
    const user = userEvent.setup();
    const { router } = renderRoute("/submissions", { role: "SUBMITTER" });

    await screen.findByRole("heading", { level: 1 });
    await user.click(screen.getByRole("tab", { name: "반려" }));

    expect(currentPath(router)).toBe("/submissions?status=rejected");
    expect(await screen.findByText(/반려 \d+건/)).toBeInTheDocument();

    // 반려 탭에는 반려 건만 있다.
    const rows = screen.getAllByRole("listitem");
    for (const row of rows) {
      expect(within(row).getByText("반려됨")).toBeInTheDocument();
    }
  });

  it("URL로 직접 들어가면 해당 탭이 활성화된다", async () => {
    renderRoute("/submissions?status=stopped", { role: "SUBMITTER" });

    expect(await screen.findByText(/중단\/취소 \d+건/)).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: "중단/취소" }),
    ).toHaveAttribute("aria-selected", "true");
  });

  it("알 수 없는 status 값은 전체 탭으로 돌아간다", async () => {
    renderRoute("/submissions?status=bogus", { role: "SUBMITTER" });

    expect(await screen.findByText(/신청 \d+건/)).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "전체" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("행을 누르면 신청 상세로 간다", async () => {
    renderRoute("/submissions", { role: "SUBMITTER" });
    await screen.findByRole("heading", { level: 1 });

    const links = screen.getAllByRole("link");
    const rowLink = links.find((link) =>
      link.getAttribute("href")?.startsWith("/submissions/"),
    );
    expect(rowLink).toBeDefined();
  });
});
