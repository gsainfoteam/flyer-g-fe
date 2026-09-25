import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createMockRepositories } from "@/mocks/repositories";
import { ApiError } from "@/shared/api/error";
import { createFixedClock } from "@/shared/lib/clock";
import { TEST_NOW, renderRoute } from "@/test/render-route";

function repositoriesWithForbiddenReviews() {
  const repositories = createMockRepositories({ clock: createFixedClock(TEST_NOW) });
  // 실제 서버는 게시자에게 승인 대기 목록을 403으로 거절한다.
  const listPending = vi.fn(async () => {
    throw new ApiError({
      kind: "http",
      code: "FORBIDDEN",
      message: "forbidden",
      status: 403,
    });
  });
  repositories.reviews.listPending = listPending;
  return { repositories, listPending };
}

describe("대시보드", () => {
  it("게시자 세션은 관리자 전용 승인 대기 목록을 조회하지 않는다", async () => {
    const { repositories, listPending } = repositoriesWithForbiddenReviews();
    renderRoute("/", { role: "SUBMITTER", repositories });

    expect(
      await screen.findByRole("link", { name: "새 게시 신청" }),
    ).toBeInTheDocument();
    expect(listPending).not.toHaveBeenCalled();
    expect(screen.queryByText("내용을 불러오지 못했어요")).not.toBeInTheDocument();
  });

  it("TV 미리보기 링크는 운영 모드가 아니라 미리보기 모드로 연다", async () => {
    renderRoute("/", { role: "REVIEWER" });

    const link = await screen.findByRole("link", { name: "미리보기 →" });
    expect(link.getAttribute("href")).toContain("preview=1");
  });
});
