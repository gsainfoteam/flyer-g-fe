import { screen } from "@testing-library/react";
import axe from "axe-core";
import { describe, expect, it } from "vitest";
import { renderRoute } from "./render-route";

/**
 * 주요 관리 화면의 자동 접근성 검사 (Phase 07, 명세 9.6).
 *
 * axe가 잡는 것은 치명적 위반(label 누락, 대비, role 오용)뿐이다. 키보드 흐름과
 * 포커스 관리는 각 화면의 상호작용 테스트가 따로 본다.
 */
async function expectNoViolations(container: HTMLElement) {
  const result = await axe.run(container, {
    rules: {
      // jsdom은 실제 렌더링이 없어 색 대비를 계산하지 못한다. 대비는 디자인
      // 토큰 테스트(design-tokens.test.ts)가 별도로 본다.
      "color-contrast": { enabled: false },
    },
  });
  expect(
    result.violations.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      nodes: violation.nodes.map((node) => node.html).slice(0, 3),
    })),
  ).toEqual([]);
}

describe("접근성 자동 검사", () => {
  it("대시보드 (게시자)", async () => {
    const { container } = renderRoute("/", { role: "SUBMITTER" });
    await screen.findByRole("heading", { name: "내 신청" });
    await expectNoViolations(container);
  });

  it("대시보드 (관리자)", async () => {
    const { container } = renderRoute("/", { role: "REVIEWER" });
    await screen.findByRole("heading", { name: "오래 기다린 순" });
    await expectNoViolations(container);
  });

  it("신청 목록", async () => {
    const { container } = renderRoute("/submissions", { role: "SUBMITTER" });
    await screen.findByText(/신청 \d+건/);
    await expectNoViolations(container);
  });

  it("신청 상세", async () => {
    const { container } = renderRoute("/submissions/notice-901", {
      role: "SUBMITTER",
    });
    await screen.findByText("처리 이력");
    await expectNoViolations(container);
  });

  it("승인 대기 목록", async () => {
    const { container } = renderRoute("/reviews", { role: "REVIEWER" });
    await screen.findByText(/승인 대기 \d+건/);
    await expectNoViolations(container);
  });

  it("검토 상세", async () => {
    const { container } = renderRoute("/reviews/notice-003", {
      role: "REVIEWER",
    });
    await screen.findByRole("button", { name: "승인" });
    await expectNoViolations(container);
  });

  it("로그인", async () => {
    const { container } = renderRoute("/submissions", { role: null });
    await screen.findByRole("button", { name: /Ziggle 계정으로 로그인/ });
    await expectNoViolations(container);
  });
});
