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
  it("소개 화면 (로그인 전)", async () => {
    const { container } = renderRoute("/", { role: null });
    await screen.findByRole("heading", { name: /전하는 우리 소식/ });
    await expectNoViolations(container);
  });

  it("첫 화면 (사용자)", async () => {
    const { container } = renderRoute("/", { role: "SUBMITTER" });
    await screen.findByRole("heading", { name: "내 콘텐츠" });
    await screen.findByText(/게시 시작/);
    await expectNoViolations(container);
  });

  it("첫 화면 (하우스 관리자)", async () => {
    const { container } = renderRoute("/", { role: "REVIEWER" });
    await screen.findByRole("heading", { name: "오늘 TV에서" });
    await screen.findByText(/TV 켜짐/);
    await expectNoViolations(container);
  });

  it("첫 화면 (운영자)", async () => {
    const { container } = renderRoute("/", { role: "SUPER_ADMIN" });
    await screen.findByRole("heading", { name: "TV 지금" });
    await screen.findByText(/B동 로비 꺼짐/);
    await expectNoViolations(container);
  });

  it("내 콘텐츠", async () => {
    const { container } = renderRoute("/mine", { role: "SUBMITTER" });
    await screen.findByRole("table");
    await expectNoViolations(container);
  });

  it("신청 상세", async () => {
    const { container } = renderRoute("/mine/notice-901", {
      role: "SUBMITTER",
    });
    await screen.findByRole("heading", { name: "진행" });
    await expectNoViolations(container);
  });

  it("심사 대기열", async () => {
    const { container } = renderRoute("/review", { role: "REVIEWER" });
    await screen.findByText(/대기 \d+건/);
    await expectNoViolations(container);
  });

  it("심사 · 고른 건", async () => {
    const { container } = renderRoute("/review/notice-003", {
      role: "REVIEWER",
    });
    await screen.findByRole("button", { name: "승인" });
    await expectNoViolations(container);
  });

  it("기기 관리", async () => {
    const { container } = renderRoute("/tv", { role: "SUPER_ADMIN" });
    await screen.findByRole("heading", { name: /디스플레이 기기/ });
    await expectNoViolations(container);
  });

  it("사용자 권한", async () => {
    const { container } = renderRoute("/settings/roles", { role: "SUPER_ADMIN" });
    await screen.findByText(/권한 있는 사용자 \d+명/);
    await expectNoViolations(container);
  });

  it("로그인", async () => {
    const { container } = renderRoute("/mine", { role: null });
    await screen.findByRole("button", { name: /인포팀 계정으로 로그인/ });
    await expectNoViolations(container);
  });
});
