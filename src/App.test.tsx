import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderRoute } from "@/test/render-route";

/**
 * 화면이 fixture가 아니라 repository 경계를 통해 데이터를 읽는지 확인한다.
 * (Phase 00 인수 조건 "App.tsx가 도메인 fixture와 비즈니스 계산을 직접 소유하지 않는다")
 */
describe("첫 화면", () => {
  it("주입한 repository의 심사 대기 건수를 가장 크게 보여준다", async () => {
    renderRoute("/", { role: "REVIEWER" });

    // fixture의 승인 대기: 기자단 모집, 하우스오피스 공지, 가을 전시
    const hero = (
      await screen.findByRole("heading", { name: "심사 대기", level: 1 })
    ).closest("section")!;
    expect(within(hero).getByText("3", { selector: "p" })).toBeInTheDocument();
  });

  it("홈에서 바로 승인하지 않고 심사 화면으로 보낸다", async () => {
    renderRoute("/", { role: "REVIEWER" });
    const queue = (
      await screen.findByRole("heading", { name: "오래 기다린 순" })
    ).closest("section")!;

    // 근거 없이 누르는 원클릭 승인 버튼은 두지 않는다. (명세 FR-REV-02)
    expect(
      screen.queryByRole("button", { name: /승인/ }),
    ).not.toBeInTheDocument();
    const rows = within(queue)
      .getAllByRole("link")
      .filter((link) => link.getAttribute("href") !== "/review");
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0]!.getAttribute("href")).toMatch(/^\/review\//);
  });

  it("역할에 따라 첫 화면이 달라진다", async () => {
    const reviewer = renderRoute("/", { role: "REVIEWER" });
    expect(
      await screen.findByRole("heading", { name: "심사 대기", level: 1 }),
    ).toBeInTheDocument();
    reviewer.unmount();

    const operator = renderRoute("/", { role: "SUPER_ADMIN" });
    expect(
      await screen.findByRole("heading", { name: /확인할 것/ }),
    ).toBeInTheDocument();
    operator.unmount();

    renderRoute("/", { role: "SUBMITTER" });
    expect(
      await screen.findByRole("heading", { name: "무엇을 올릴까요?" }),
    ).toBeInTheDocument();
  });

  it("로그인 전에는 소개 화면을 보여준다", async () => {
    renderRoute("/", { role: null });
    expect(
      await screen.findByRole("heading", { name: /띄우고 싶은 게/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /인포팀 계정으로 로그인/ }),
    ).toBeInTheDocument();
  });
});
