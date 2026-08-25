import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/shared/api/error";
import type { AuthAdapter } from "../api/auth-adapter";
import { createMockAuthAdapter } from "../api/mock-auth";
import { useAuth } from "../model/auth-context";
import { AuthProvider } from "./AuthProvider";

function Probe() {
  const { state, signIn, signOut } = useAuth();
  return (
    <div>
      <p>상태: {state.status}</p>
      {state.status === "authenticated" && <p>사용자: {state.user.displayName}</p>}
      {state.status === "error" && <p>오류: {state.error.code}</p>}
      <button type="button" onClick={() => void signIn("/")}>
        로그인
      </button>
      <button type="button" onClick={() => void signOut()}>
        로그아웃
      </button>
    </div>
  );
}

function renderWith(adapter: AuthAdapter) {
  return render(
    <AuthProvider adapter={adapter}>
      <Probe />
    </AuthProvider>,
  );
}

describe("AuthProvider", () => {
  it("복원하는 동안은 initializing이다", async () => {
    // 이 상태가 없으면 로그인한 사용자에게 로그인 화면이 잠깐 스쳐 보인다.
    let resolve: (value: null) => void = () => {};
    const adapter: AuthAdapter = {
      restore: () => new Promise((r) => { resolve = r; }),
      signIn: vi.fn(),
      signOut: vi.fn(),
    };

    renderWith(adapter);
    expect(screen.getByText("상태: initializing")).toBeInTheDocument();

    resolve(null);
    await waitFor(() =>
      expect(screen.getByText("상태: unauthenticated")).toBeInTheDocument(),
    );
  });

  it("기존 세션을 복원한다", async () => {
    sessionStorage.clear();
    renderWith(createMockAuthAdapter({ initialRole: "REVIEWER" }));

    await waitFor(() =>
      expect(screen.getByText("상태: authenticated")).toBeInTheDocument(),
    );
    expect(screen.getByText("사용자: 이수현")).toBeInTheDocument();
  });

  it("복원이 실패하면 error 상태로 남는다", async () => {
    const adapter: AuthAdapter = {
      restore: () =>
        Promise.reject(
          new ApiError({ kind: "http", code: "UNAUTHENTICATED", message: "만료" }),
        ),
      signIn: vi.fn(),
      signOut: vi.fn(),
    };

    renderWith(adapter);
    await waitFor(() =>
      expect(screen.getByText("오류: UNAUTHENTICATED")).toBeInTheDocument(),
    );
  });

  it("로그인과 로그아웃이 상태를 옮긴다", async () => {
    sessionStorage.clear();
    renderWith(createMockAuthAdapter({ initialRole: null }));

    await waitFor(() =>
      expect(screen.getByText("상태: unauthenticated")).toBeInTheDocument(),
    );

    await userEvent.click(screen.getByRole("button", { name: "로그인" }));
    await waitFor(() =>
      expect(screen.getByText("상태: authenticated")).toBeInTheDocument(),
    );

    await userEvent.click(screen.getByRole("button", { name: "로그아웃" }));
    await waitFor(() =>
      expect(screen.getByText("상태: unauthenticated")).toBeInTheDocument(),
    );
  });

  it("mock이 아닌 adapter에는 역할 전환이 없다", async () => {
    const adapter: AuthAdapter = {
      restore: () => Promise.resolve(null),
      signIn: vi.fn(),
      signOut: vi.fn(),
    };

    function SwitchProbe() {
      const { switchRole, availableRoles } = useAuth();
      return (
        <p>
          전환: {switchRole ? "있음" : "없음"} · 역할 {availableRoles.length}
        </p>
      );
    }

    render(
      <AuthProvider adapter={adapter}>
        <SwitchProbe />
      </AuthProvider>,
    );

    expect(screen.getByText("전환: 없음 · 역할 0")).toBeInTheDocument();
  });
});

describe("mock 인증", () => {
  it("자격 증명이 아니라 역할 이름만 저장한다", async () => {
    sessionStorage.clear();
    const adapter = createMockAuthAdapter({ initialRole: null });

    await adapter.signIn("/");

    const stored = Object.entries({ ...sessionStorage });
    expect(stored).toHaveLength(1);
    const [key, value] = stored[0]!;
    expect(key).toContain("mock-role");
    expect(value).toBe("REVIEWER");

    await adapter.signOut();
    expect(Object.keys({ ...sessionStorage })).toHaveLength(0);
  });
});
