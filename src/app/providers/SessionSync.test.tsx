import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { createMockRepositories } from "@/mocks/repositories";
import { ApiError } from "@/shared/api/error";
import { createFixedClock } from "@/shared/lib/clock";
import { TEST_NOW, currentPath, renderRoute } from "@/test/render-route";

/**
 * 세션과 서버 상태 캐시 동기화.
 *
 * - 어떤 조회든 401이면 세션이 끝난 것이다. 보던 경로를 기억해 로그인으로 보낸다.
 * - 역할을 바꾸면 이전 사용자의 목록이 남지 않는다.
 */
describe("세션 동기화", () => {
  it("조회가 401이면 로그인 화면으로 보내고 만료를 알린다", async () => {
    const repositories = createMockRepositories({
      clock: createFixedClock(TEST_NOW),
    });
    repositories.submissions.getSummary = async () => {
      throw new ApiError({
        kind: "http",
        code: "UNAUTHENTICATED",
        message: "session expired",
        status: 401,
      });
    };
    const { router } = renderRoute("/reviews", {
      role: "REVIEWER",
      repositories,
    });

    expect(
      await screen.findByText("로그인이 만료되었어요"),
    ).toBeInTheDocument();
    expect(currentPath(router)).toBe("/login?returnTo=%2Freviews");
  });

  it("역할을 바꾸면 이전 사용자의 신청 목록이 남지 않는다", async () => {
    const user = userEvent.setup();
    renderRoute("/submissions", { role: "REVIEWER" });

    // 하우스 관리자 이수현은 하우스오피스 공지 한 건만 직접 신청했다.
    await screen.findByRole("main");
    const main = () => within(screen.getByRole("main"));
    expect(
      await main().findByText(/2026학년도 2학기 기숙사 디지털 게시판/),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "계정 메뉴" }));
    await user.click(
      await screen.findByRole("menuitemradio", { name: "게시자" }),
    );

    expect(
      await main().findByText("슈퍼-피셜 신입 부원 모집"),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(
        main().queryByText(/2026학년도 2학기 기숙사 디지털 게시판/),
      ).toBeNull();
    });
  });
});
