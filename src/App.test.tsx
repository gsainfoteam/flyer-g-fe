import { QueryClient } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App";
import { AppProviders } from "./app/providers/AppProviders";
import { createMockRepositories } from "@/mocks/repositories";
import { createFixedClock } from "@/shared/lib/clock";
import { parseIsoUtc } from "@/shared/lib/datetime";

/**
 * 화면이 fixture가 아니라 repository 경계를 통해 데이터를 읽는지 확인한다.
 * (Phase 00 인수 조건 "App.tsx가 도메인 fixture와 비즈니스 계산을 직접 소유하지 않는다")
 */
const NOW = parseIsoUtc("2026-06-08T03:00:00.000Z");

function renderApp() {
  const repositories = createMockRepositories({
    clock: createFixedClock(NOW),
  });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <AppProviders repositories={repositories} queryClient={queryClient}>
      <App />
    </AppProviders>,
  );
}

describe("대시보드", () => {
  it("주입한 repository의 상태별 건수를 보여준다", async () => {
    renderApp();

    const counts = await screen.findByRole("group", { name: "상태별 건수" });
    for (const label of ["승인 대기", "게시 중", "예약됨", "종료됨"]) {
      expect(within(counts).getByText(label)).toBeInTheDocument();
    }
  });

  it("통계의 기준 시각을 함께 표시한다", async () => {
    renderApp();
    // 2026-06-08T03:00Z == 2026. 06. 08. 12:00 KST
    expect(
      await screen.findByText(/2026\. 06\. 08\. 12:00 · 서버 시각 기준/),
    ).toBeInTheDocument();
  });

  it("의미가 불명확한 조회수와 증감률을 보여주지 않는다", async () => {
    renderApp();
    await screen.findByRole("group", { name: "상태별 건수" });

    expect(screen.queryByText(/총 조회수/)).not.toBeInTheDocument();
    expect(screen.queryByText(/지난 7일 대비/)).not.toBeInTheDocument();
  });

  it("서버에 반영되지 않는 승인 버튼을 두지 않는다", async () => {
    renderApp();
    await screen.findByRole("heading", { name: "오래 기다린 순" });

    expect(
      screen.queryByRole("button", { name: "승인하기" }),
    ).not.toBeInTheDocument();
    // Phase 04 전까지 검토 버튼은 눌러도 서버에 아무 일도 일어나지 않으므로 비활성이다.
    for (const button of screen.getAllByRole("button", { name: "검토" })) {
      expect(button).toBeDisabled();
    }
  });

  it("상태 배지 옆에 지금 상황을 설명하는 문장을 함께 둔다", async () => {
    renderApp();
    await screen.findByRole("heading", { name: "내 신청" });

    expect(screen.getAllByText(/TV에 나오고 있어요/).length).toBeGreaterThan(0);
  });
});

