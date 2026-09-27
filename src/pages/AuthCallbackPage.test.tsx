import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { AuthAdapter } from "@/features/auth/api/auth-adapter";
import { ApiError } from "@/shared/api/error";
import { MOCK_USERS } from "@/mocks/users";
import { currentPath, renderRoute } from "@/test/render-route";

/** 제공자에서 돌아온 뒤만 흉내 낸다. 복원할 세션은 없다. */
function returningAdapter(
  completeSignIn: AuthAdapter["completeSignIn"],
): AuthAdapter {
  return {
    restore: async () => null,
    signIn: vi.fn(),
    completeSignIn,
    signOut: vi.fn(async () => {}),
  };
}

describe("로그인 복귀 화면", () => {
  it("로그인을 마치면 시작할 때 보던 화면으로 돌아간다", async () => {
    const completeSignIn = vi.fn<AuthAdapter["completeSignIn"]>(async () => ({
      user: MOCK_USERS.REVIEWER,
      returnTo: "/reviews",
    }));
    const { router } = renderRoute("/auth/callback?code=code-1&state=s-1", {
      authAdapter: returningAdapter(completeSignIn),
    });

    await waitFor(() => expect(currentPath(router)).toBe("/reviews"));
    expect(completeSignIn.mock.calls[0]![0].get("code")).toBe("code-1");
    // 뒤로 가기로 code가 든 주소에 다시 오지 않게 기록을 바꿔 넣는다.
    expect(router.state.historyAction).toBe("REPLACE");
  });

  it("실패하면 이유를 알리고 다시 로그인하게 한다", async () => {
    const { router } = renderRoute("/auth/callback?code=code-1&state=s-1", {
      authAdapter: returningAdapter(async () => {
        throw new ApiError({
          kind: "unknown",
          code: "AUTH_STATE_MISMATCH",
          message: "state 불일치",
        });
      }),
    });

    expect(
      await screen.findByRole("heading", { name: "로그인하지 못했어요" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/로그인 요청이 만료되었거나/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "다시 로그인" }));
    await waitFor(() => expect(currentPath(router)).toBe("/login"));
  });

  it("결과 없이 직접 열면 로그인 화면으로 보낸다", async () => {
    const completeSignIn = vi.fn();
    const { router } = renderRoute("/auth/callback", {
      authAdapter: returningAdapter(completeSignIn),
    });

    await waitFor(() => expect(currentPath(router)).toBe("/login"));
    expect(completeSignIn).not.toHaveBeenCalled();
  });
});
