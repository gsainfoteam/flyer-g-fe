import { QueryClient } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
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
  it("주입한 repository의 요약 통계를 보여준다", async () => {
    renderApp();

    expect(await screen.findByText("전체 콘텐츠")).toBeInTheDocument();
    expect(screen.getByText("게시 중인 콘텐츠")).toBeInTheDocument();
    expect(screen.getByText("예약된 콘텐츠")).toBeInTheDocument();
  });

  it("통계의 기준 시각을 함께 표시한다", async () => {
    renderApp();
    // 2026-06-08T03:00Z == 2026. 06. 08. 12:00 KST
    expect(await screen.findByText(/2026\. 06\. 08\. 12:00 기준/)).toBeInTheDocument();
  });

  it("의미가 불명확한 조회수와 증감률을 보여주지 않는다", async () => {
    renderApp();
    await screen.findByText("전체 콘텐츠");

    expect(screen.queryByText(/총 조회수/)).not.toBeInTheDocument();
    expect(screen.queryByText(/지난 7일 대비/)).not.toBeInTheDocument();
  });

  it("서버에 반영되지 않는 승인 버튼을 두지 않는다", async () => {
    renderApp();
    await screen.findByRole("heading", { name: "승인 대기" });

    expect(
      screen.queryByRole("button", { name: "승인하기" }),
    ).not.toBeInTheDocument();
  });
});
