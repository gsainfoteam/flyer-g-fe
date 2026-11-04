import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { currentPath, renderRoute } from "@/test/render-route";

/**
 * 전체 컨텐츠 (하우스 관리자·운영자, 명세 FR-DASH-02).
 * 실제 route로 띄워 상태 탭의 URL 동기화를 확인한다.
 */
describe("전체 콘텐츠", () => {
  it("상태 탭이 URL에 반영되고 직접 접근해도 같은 화면이 나온다", async () => {
    const user = userEvent.setup();
    const { router } = renderRoute("/contents", { role: "REVIEWER" });

    await screen.findByRole("heading", { name: /전체 콘텐츠 \d+건/ });
    await user.click(screen.getByRole("tab", { name: /^반려/ }));

    expect(currentPath(router)).toBe("/contents?status=rejected");
    expect(await screen.findByText(/반려 \d+건/)).toBeInTheDocument();

    const rows = within(screen.getByRole("main")).getAllByRole("listitem");
    for (const row of rows) {
      expect(within(row).getByText("반려됨")).toBeInTheDocument();
    }
  });

  it("URL로 직접 들어가면 해당 탭이 활성화된다", async () => {
    renderRoute("/contents?status=stopped", { role: "REVIEWER" });

    expect(await screen.findByText(/중단\/취소 \d+건/)).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /^중단\/취소/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("알 수 없는 status 값은 전체 탭으로 돌아간다", async () => {
    renderRoute("/contents?status=bogus", { role: "REVIEWER" });

    expect(
      await screen.findByRole("heading", { name: /전체 콘텐츠 \d+건/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /^전체/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("화살표 키로 탭을 옮긴다", async () => {
    const user = userEvent.setup();
    const { router } = renderRoute("/contents", { role: "REVIEWER" });
    const all = await screen.findByRole("tab", { name: /^전체/ });

    all.focus();
    await user.keyboard("{ArrowRight}");

    expect(currentPath(router)).toBe("/contents?status=pending");
    expect(screen.getByRole("tab", { name: /^승인 대기/ })).toHaveFocus();
  });

  it("남의 콘텐츠는 검토 화면으로, 내 것은 상세로 간다", async () => {
    renderRoute("/contents", { role: "REVIEWER" });

    const row = await screen.findByRole("link", {
      name: /VESPER 피아노 정기공연/,
    });
    // 게시 중인 남의 신청 → 중단할 수 있는 검토 화면
    expect(row).toHaveAttribute("href", "/review/notice-001");
    // 하우스 관리자 이수현이 직접 낸 하우스오피스 공지
    expect(
      screen.getByRole("link", { name: /2026학년도 2학기 기숙사 디지털 게시판/ }),
    ).toHaveAttribute("href", "/mine/notice-005");
  });

  it("사용자는 주소로 와도 권한 안내를 본다", async () => {
    renderRoute("/contents", { role: "SUBMITTER" });

    expect(
      await screen.findByRole("heading", { name: "접근 권한 없음" }),
    ).toBeInTheDocument();
  });
});
