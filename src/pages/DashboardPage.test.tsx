import { screen, within } from "@testing-library/react";
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

  it("관리자에게 기기 연결 상태를 보여준다", async () => {
    renderRoute("/", { role: "REVIEWER" });

    const panel = (
      await screen.findByRole("heading", { name: "디스플레이 2대" })
    ).closest("section")!;
    const rows = within(panel).getAllByRole("listitem");
    expect(rows[0]).toHaveTextContent("A동 로비");
    expect(rows[0]).toHaveTextContent("온라인");
    expect(rows[1]).toHaveTextContent("B동 로비");
    expect(rows[1]).toHaveTextContent("26분 전");
    expect(rows[1]).toHaveTextContent("오프라인");
  });

  it("게시자에게는 기기 상태를 조회하지도 보여주지도 않는다", async () => {
    const repositories = createMockRepositories({
      clock: createFixedClock(TEST_NOW),
    });
    const listDevices = vi.spyOn(repositories.devices, "list");
    renderRoute("/", { role: "SUBMITTER", repositories });

    await screen.findByRole("link", { name: "새 게시 신청" });
    expect(screen.queryByText(/디스플레이/)).toBeNull();
    expect(listDevices).not.toHaveBeenCalled();
  });
});
