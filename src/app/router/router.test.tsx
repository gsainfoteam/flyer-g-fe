import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { currentPath, renderRoute } from "@/test/render-route";

/**
 * Phase 01 인수 조건: 라우팅, 셸 분리, 역할 기반 접근, 복귀 경로.
 *
 * 화면을 감추는 것은 편의일 뿐 보안이 아니다. 여기서 확인하는 것은 "권한 없는
 * 사용자가 관리 화면을 볼 수 없다"까지이고, 실제 차단은 서버가 한다.
 */
describe("직접 URL 접근", () => {
  it("알 수 없는 경로는 없는 화면을 보여준다", async () => {
    renderRoute("/무엇인가", { role: "REVIEWER" });
    expect(
      await screen.findByRole("heading", { name: "찾는 화면이 없어요" }),
    ).toBeInTheDocument();
  });

  it("기기 경로는 deviceId로 그 기기의 편성을 받는다", async () => {
    renderRoute("/display/house-a-lobby");
    // 편성 응답에 실려 온 기기 이름이 TV 머리에 나온다.
    expect(await screen.findByText("A동 로비")).toBeInTheDocument();
  });
});

describe("세션 guard", () => {
  it("로그아웃 상태로 관리 화면에 오면 로그인으로 보낸다", async () => {
    const { router } = renderRoute("/reviews");

    await waitFor(() => {
      expect(currentPath(router)).toBe("/login?returnTo=%2Freviews");
    });
    expect(
      await screen.findByRole("heading", { name: /Ziggle 계정으로 시작해요/ }),
    ).toBeInTheDocument();
  });

  it("로그인하면 원래 가려던 경로로 돌아간다", async () => {
    const { router } = renderRoute("/reviews");

    await screen.findByRole("button", { name: "Ziggle 계정으로 로그인" });
    await userEvent.click(
      screen.getByRole("button", { name: "Ziggle 계정으로 로그인" }),
    );

    await waitFor(() => expect(currentPath(router)).toBe("/reviews"));
    expect(
      await screen.findByRole("heading", { name: /승인 대기/ }),
    ).toBeInTheDocument();
  });

  it("이미 로그인한 사용자가 로그인 화면에 오면 홈으로 보낸다", async () => {
    const { router } = renderRoute("/login", { role: "SUBMITTER" });
    await waitFor(() => expect(currentPath(router)).toBe("/"));
  });
});

describe("역할 기반 접근", () => {
  it("게시자는 검토 화면을 볼 수 없다", async () => {
    renderRoute("/reviews", { role: "SUBMITTER" });

    expect(
      await screen.findByRole("heading", { name: "이 화면을 볼 권한이 없어요" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: /승인 대기 \d+건/ }),
    ).not.toBeInTheDocument();
  });

  it("하우스 관리자는 검토 화면을 볼 수 있다", async () => {
    renderRoute("/reviews", { role: "REVIEWER" });
    expect(
      await screen.findByRole("heading", { name: /승인 대기/ }),
    ).toBeInTheDocument();
  });

  it("기기 관리는 운영자만 볼 수 있다", async () => {
    renderRoute("/displays", { role: "REVIEWER" });
    expect(
      await screen.findByRole("heading", { name: "이 화면을 볼 권한이 없어요" }),
    ).toBeInTheDocument();
  });

  it("역할에 없는 메뉴는 내비게이션에 그리지 않는다", async () => {
    renderRoute("/", { role: "SUBMITTER" });
    await screen.findByRole("navigation", { name: "주요 메뉴" });

    const nav = screen.getByRole("navigation", { name: "주요 메뉴" });
    expect(nav).toHaveTextContent("내 신청");
    expect(nav).not.toHaveTextContent("승인 대기");
    expect(nav).not.toHaveTextContent("기기");
  });
});

describe("셸 분리", () => {
  it("TV 경로에는 관리 내비게이션이 없다", async () => {
    renderRoute("/display/house-a-lobby");
    await screen.findByText("A동 로비");

    expect(
      screen.queryByRole("navigation", { name: "주요 메뉴" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "로그아웃" }),
    ).not.toBeInTheDocument();
  });

  it("게시 신청 화면도 관리 내비게이션을 쓰지 않는다", async () => {
    renderRoute("/studio", { role: "SUBMITTER" });
    await screen.findByRole("heading", { name: "게시 신청" });

    expect(
      screen.queryByRole("navigation", { name: "주요 메뉴" }),
    ).not.toBeInTheDocument();
  });

  it("관리 화면에는 내비게이션과 푸터가 있다", async () => {
    renderRoute("/", { role: "REVIEWER" });
    await screen.findByRole("navigation", { name: "주요 메뉴" });

    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
  });
});

describe("세션 종료", () => {
  it("로그아웃하면 관리 화면에서 로그인으로 돌아간다", async () => {
    const { router } = renderRoute("/", { role: "REVIEWER" });
    await screen.findByRole("navigation", { name: "주요 메뉴" });

    await userEvent.click(screen.getByRole("button", { name: "계정 메뉴" }));
    await userEvent.click(
      await screen.findByRole("menuitem", { name: "로그아웃" }),
    );

    await waitFor(() => expect(currentPath(router)).toContain("/login"));
  });
});

describe("탭 제목", () => {
  it("화면마다 탭 제목이 다르다", async () => {
    renderRoute("/reviews", { role: "REVIEWER" });

    await waitFor(() => expect(document.title).toBe("승인 대기 · 전단지"));
  });
});

describe("권한 없음", () => {
  it("화면을 볼 수 있는 역할을 그 화면에 맞게 알린다", async () => {
    renderRoute("/displays", { role: "REVIEWER" });

    expect(
      await screen.findByText(/시스템 운영자에게만 열려 있는 화면이에요/),
    ).toBeInTheDocument();
  });
});
