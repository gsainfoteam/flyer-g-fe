import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/shared/api/error";
import { EmptyState, ErrorState, LoadingState, PageState } from "./PageState";

describe("LoadingState", () => {
  it("보조 기술에 진행 상태를 알린다", () => {
    render(<LoadingState />);
    expect(screen.getAllByRole("status").length).toBeGreaterThan(0);
    expect(screen.getByText("불러오는 중입니다.")).toBeInTheDocument();
  });
});

describe("EmptyState", () => {
  it("제목, 설명, 작업을 보여준다", () => {
    render(
      <EmptyState
        title="아직 신청한 콘텐츠가 없습니다."
        description="포스터를 올려 첫 게시를 신청해 보세요."
        action={<button type="button">콘텐츠 등록</button>}
      />,
    );
    expect(screen.getByText("아직 신청한 콘텐츠가 없습니다.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "콘텐츠 등록" })).toBeInTheDocument();
  });
});

describe("ErrorState", () => {
  it("서버 내부 정보를 노출하지 않고 사용자 문구만 보여준다", () => {
    render(
      <ErrorState
        error={
          new ApiError({
            kind: "http",
            code: "SERVER_ERROR",
            message: "NullPointerException at ReviewService.java:88",
            status: 500,
            requestId: "req-1",
          })
        }
      />,
    );

    expect(screen.queryByText(/ReviewService/)).not.toBeInTheDocument();
    expect(screen.getByText(/일시적인 오류가 발생했습니다/)).toBeInTheDocument();
    expect(screen.getByText("요청 ID: req-1")).toBeInTheDocument();
  });

  it("requestId가 없으면 추적 문구를 그리지 않는다", () => {
    render(
      <ErrorState
        error={new ApiError({ kind: "network", code: "NETWORK_ERROR", message: "m" })}
      />,
    );
    expect(screen.queryByText(/요청 ID/)).not.toBeInTheDocument();
  });

  it("재시도 버튼을 누르면 콜백이 실행된다", async () => {
    const onRetry = vi.fn();
    render(<ErrorState onRetry={onRetry} />);
    await userEvent.click(screen.getByRole("button", { name: "다시 불러오기" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});

describe("PageState", () => {
  it("로딩 → 오류 → 빈 상태 → 본문 순서로 분기한다", () => {
    const empty = { title: "비어 있습니다." };

    const { rerender } = render(
      <PageState isLoading error={new Error("x")} isEmpty empty={empty}>
        <p>본문</p>
      </PageState>,
    );
    expect(screen.getByText("불러오는 중입니다.")).toBeInTheDocument();

    rerender(
      <PageState error={new Error("x")} isEmpty empty={empty}>
        <p>본문</p>
      </PageState>,
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();

    rerender(
      <PageState isEmpty empty={empty}>
        <p>본문</p>
      </PageState>,
    );
    expect(screen.getByText("비어 있습니다.")).toBeInTheDocument();

    rerender(
      <PageState empty={empty}>
        <p>본문</p>
      </PageState>,
    );
    expect(screen.getByText("본문")).toBeInTheDocument();
  });
});
