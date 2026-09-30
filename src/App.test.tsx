import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderRoute } from "@/test/render-route";

/**
 * 화면이 fixture가 아니라 repository 경계를 통해 데이터를 읽는지 확인한다.
 * (Phase 00 인수 조건 "App.tsx가 도메인 fixture와 비즈니스 계산을 직접 소유하지 않는다")
 */
describe("대시보드", () => {
  it("주입한 repository의 승인 대기 건수를 제목에 보여준다", async () => {
    renderRoute("/", { role: "REVIEWER" });

    // fixture의 승인 대기: 기자단 모집, 하우스오피스 공지, 가을 전시
    expect(
      await screen.findByRole("heading", {
        name: "검토를 기다리는 신청 3건",
      }),
    ).toBeInTheDocument();
  });

  it("홈 머리에 날짜와 기준 시각을 두지 않는다", async () => {
    renderRoute("/", { role: "REVIEWER" });
    await screen.findByRole("heading", { name: /검토를 기다리는 신청/ });

    expect(screen.queryByText(/서버 시각 기준/)).not.toBeInTheDocument();
    expect(screen.queryByText(/2026\. 06\. 08\./)).not.toBeInTheDocument();
  });

  it("의미가 불명확한 조회수와 증감률을 보여주지 않는다", async () => {
    renderRoute("/", { role: "REVIEWER" });
    await screen.findByRole("heading", { name: /검토를 기다리는 신청/ });

    expect(screen.queryByText(/총 조회수/)).not.toBeInTheDocument();
    expect(screen.queryByText(/지난 7일 대비/)).not.toBeInTheDocument();
  });

  it("대시보드에서 바로 승인하지 않고 검토 상세로 보낸다", async () => {
    renderRoute("/", { role: "REVIEWER" });
    await screen.findByRole("heading", { name: /검토 대기/ });

    // 근거 없이 누르는 원클릭 승인 버튼은 두지 않는다. (명세 FR-REV-02)
    expect(
      screen.queryByRole("button", { name: "승인하기" }),
    ).not.toBeInTheDocument();
    const reviewLinks = screen.getAllByRole("link", { name: / 검토$/ });
    expect(reviewLinks.length).toBeGreaterThan(0);
    expect(reviewLinks[0]!.getAttribute("href")).toMatch(/^\/reviews\//);
  });

  it("진행 중인 신청마다 지금 상황과 다음에 일어날 일을 한 문장으로 둔다", async () => {
    renderRoute("/", { role: "SUBMITTER" });
    await screen.findByRole("heading", { name: /진행 중인 신청/ });

    expect(await screen.findByText(/TV에 걸려 있어요/)).toBeInTheDocument();
    expect(
      screen.getByText(/관리자 검토를 기다린 지 .+째예요/),
    ).toBeInTheDocument();
  });

  it("역할에 따라 첫 문장이 달라진다", async () => {
    const reviewer = renderRoute("/", { role: "REVIEWER" });
    expect(
      await screen.findByRole("heading", { name: /검토를 기다리는 신청/ }),
    ).toBeInTheDocument();
    reviewer.unmount();

    renderRoute("/", { role: "SUBMITTER" });
    expect(
      await screen.findByRole("heading", { name: "안녕하세요, 정하윤님" }),
    ).toBeInTheDocument();
  });
});
