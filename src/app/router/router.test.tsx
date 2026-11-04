import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { MOCK_USERS } from "@/mocks/users";
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
      await screen.findByRole("heading", { name: "페이지를 찾을 수 없습니다" }),
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
    const { router } = renderRoute("/review");

    await waitFor(() => {
      expect(currentPath(router)).toBe("/login?returnTo=%2Freview");
    });
    expect(
      await screen.findByRole("heading", {
        name: /인포팀 계정 로그인/,
      }),
    ).toBeInTheDocument();
  });

  it("로그인하면 원래 가려던 경로로 돌아간다", async () => {
    const { router } = renderRoute("/review");

    await screen.findByRole("button", { name: "인포팀 계정으로 로그인" });
    await userEvent.click(
      screen.getByRole("button", { name: "인포팀 계정으로 로그인" }),
    );

    await waitFor(() => expect(currentPath(router)).toBe("/review"));
    expect(
      await screen.findByRole("heading", { name: "심사", level: 1 }),
    ).toBeInTheDocument();
  });

  it("이미 로그인한 사용자가 로그인 화면에 오면 홈으로 보낸다", async () => {
    const { router } = renderRoute("/login", { role: "SUBMITTER" });
    await waitFor(() => expect(currentPath(router)).toBe("/"));
  });
});

describe("역할 기반 접근", () => {
  it("게시자는 검토 화면을 볼 수 없다", async () => {
    renderRoute("/review", { role: "SUBMITTER" });

    expect(
      await screen.findByRole("heading", {
        name: "접근 권한 없음",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "심사", level: 1 }),
    ).not.toBeInTheDocument();
  });

  it("하우스 관리자는 검토 화면을 볼 수 있다", async () => {
    renderRoute("/review", { role: "REVIEWER" });
    expect(
      await screen.findByRole("heading", { name: "심사", level: 1 }),
    ).toBeInTheDocument();
  });

  it("TV 관리는 운영자만 볼 수 있다", async () => {
    renderRoute("/tv", { role: "REVIEWER" });
    expect(
      await screen.findByRole("heading", {
        name: "접근 권한 없음",
      }),
    ).toBeInTheDocument();
  });

  it("역할에 없는 메뉴는 내비게이션에 그리지 않는다", async () => {
    renderRoute("/", { role: "SUBMITTER" });
    await screen.findByRole("navigation", { name: "주요 메뉴" });

    const nav = screen.getByRole("navigation", { name: "주요 메뉴" });
    expect(nav).toHaveTextContent("내 콘텐츠");
    expect(nav).not.toHaveTextContent("심사");
    expect(nav).not.toHaveTextContent("TV");
    expect(nav).not.toHaveTextContent("설정");
  });
});

describe("역할별 메뉴", () => {
  it("운영자는 하우스 관리자 메뉴를 모두 갖고 TV와 설정을 더 가진다", async () => {
    renderRoute("/", { role: "SUPER_ADMIN" });
    const nav = await screen.findByRole("navigation", { name: "주요 메뉴" });

    const labels = Array.from(nav.querySelectorAll("a")).map((link) =>
      link.textContent?.replace(/\d+$/, ""),
    );
    expect(labels).toEqual(["홈", "심사", "전체 콘텐츠", "TV", "설정"]);
  });

  it("하우스 관리자는 TV와 설정 메뉴가 없다", async () => {
    renderRoute("/", { role: "REVIEWER" });
    const nav = await screen.findByRole("navigation", { name: "주요 메뉴" });

    const labels = Array.from(nav.querySelectorAll("a")).map((link) =>
      link.textContent?.replace(/\d+$/, ""),
    );
    expect(labels).toEqual(["홈", "심사", "전체 콘텐츠"]);
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

  it("포스터 올리기 화면도 관리 내비게이션을 쓰지 않는다", async () => {
    renderRoute("/new/poster", { role: "SUBMITTER" });
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
    const { router } = renderRoute("/review", { role: "REVIEWER" });
    await screen.findByRole("navigation", { name: "주요 메뉴" });

    await userEvent.click(screen.getByRole("button", { name: "계정 메뉴" }));
    await userEvent.click(
      await screen.findByRole("menuitem", { name: "로그아웃" }),
    );

    await waitFor(() => expect(currentPath(router)).toContain("/login"));
  });
});

describe("사용자 화면으로 보기", () => {
  const VIEW_AS_USER_KEY = "flyerg:view-as-user";
  const nav = () => screen.findByRole("navigation", { name: "주요 메뉴" });
  const openMenu = () =>
    userEvent.click(screen.getByRole("button", { name: "계정 메뉴" }));

  afterEach(() => localStorage.removeItem(VIEW_AS_USER_KEY));

  it("관리자는 프로필 메뉴에서 사용자 화면으로 바꾸고 다시 돌아온다", async () => {
    const { router } = renderRoute("/review", { role: "SUPER_ADMIN" });
    const menu = within(await nav());
    expect(menu.getByRole("link", { name: /심사/ })).toBeInTheDocument();

    await openMenu();
    await userEvent.click(
      await screen.findByRole("menuitem", { name: "사용자 화면으로 보기" }),
    );

    await waitFor(() => expect(currentPath(router)).toBe("/"));
    expect(
      within(await nav()).queryByRole("link", { name: /심사/ }),
    ).toBeNull();
    expect(within(await nav()).queryByRole("link", { name: "TV" })).toBeNull();
    expect(
      within(await nav()).getByRole("link", { name: "내 콘텐츠" }),
    ).toBeInTheDocument();

    await openMenu();
    expect(
      await screen.findByText("시스템 운영자 · 사용자 화면으로 보는 중"),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("menuitem", { name: "시스템 운영자 화면으로 돌아가기" }),
    );

    expect(
      await within(await nav()).findByRole("link", { name: /심사/ }),
    ).toBeInTheDocument();
    expect(localStorage.getItem(VIEW_AS_USER_KEY)).toBeNull();
  });

  it("사용자에게는 바꾸는 메뉴가 없다", async () => {
    renderRoute("/mine", { role: "SUBMITTER" });
    await nav();

    await openMenu();

    await screen.findByRole("menuitem", { name: "로그아웃" });
    expect(
      screen.queryByRole("menuitem", { name: "사용자 화면으로 보기" }),
    ).toBeNull();
  });

  it("사용자 화면에서 관리 화면 주소를 열면 돌아가는 길을 알려 준다", async () => {
    localStorage.setItem(VIEW_AS_USER_KEY, MOCK_USERS.REVIEWER.id);
    renderRoute("/review", { role: "REVIEWER" });

    await userEvent.click(
      await screen.findByRole("button", {
        name: "하우스 관리자 화면으로 돌아가기",
      }),
    );

    expect(
      await screen.findByRole("heading", { name: "심사", level: 1 }),
    ).toBeInTheDocument();
  });

  it("새로고침해도 유지하고, 다른 계정에는 적용하지 않는다", async () => {
    localStorage.setItem(VIEW_AS_USER_KEY, MOCK_USERS.REVIEWER.id);
    const { unmount } = renderRoute("/", { role: "REVIEWER" });
    expect(
      within(await nav()).queryByRole("link", { name: /심사/ }),
    ).toBeNull();
    unmount();

    renderRoute("/", { role: "SUPER_ADMIN" });
    expect(
      await within(await nav()).findByRole("link", { name: /심사/ }),
    ).toBeInTheDocument();
  });

  it("로그아웃하면 풀린다", async () => {
    localStorage.setItem(VIEW_AS_USER_KEY, MOCK_USERS.REVIEWER.id);
    renderRoute("/", { role: "REVIEWER" });
    await nav();

    await openMenu();
    await userEvent.click(
      await screen.findByRole("menuitem", { name: "로그아웃" }),
    );

    await waitFor(() =>
      expect(localStorage.getItem(VIEW_AS_USER_KEY)).toBeNull(),
    );
  });
});

describe("탭 제목", () => {
  it("화면마다 탭 제목이 다르다", async () => {
    renderRoute("/review", { role: "REVIEWER" });

    await waitFor(() => expect(document.title).toBe("심사 · 전단지"));
  });
});

describe("권한 없음", () => {
  it("화면을 볼 수 있는 역할을 그 화면에 맞게 알린다", async () => {
    renderRoute("/tv", { role: "REVIEWER" });

    expect(
      await screen.findByText(/시스템 운영자만 접근할 수 있는 화면입니다/),
    ).toBeInTheDocument();
  });
});

describe("개편 전 주소", () => {
  it("옛 목록 주소는 범위와 상태 탭을 지켜 새 주소로 간다", async () => {
    const { router } = renderRoute("/submissions?scope=all&status=published", {
      role: "REVIEWER",
    });
    await waitFor(() =>
      expect(currentPath(router)).toBe("/contents?status=published"),
    );
  });

  it("옛 내 신청 상태 탭은 내 콘텐츠의 보기로 바꾼다", async () => {
    const { router } = renderRoute("/submissions?status=ended", {
      role: "SUBMITTER",
    });
    await waitFor(() => expect(currentPath(router)).toBe("/mine?view=past"));
  });

  it("옛 심사 목록 주소는 분류 필터를 지킨다", async () => {
    const { router } = renderRoute("/reviews?category=club", {
      role: "REVIEWER",
    });
    await waitFor(() =>
      expect(currentPath(router)).toBe("/review?category=club"),
    );
  });

  it("옛 수정 주소는 고칠 신청을 그대로 연다", async () => {
    const { router } = renderRoute("/studio?submissionId=notice-903", {
      role: "SUBMITTER",
    });
    await waitFor(() =>
      expect(currentPath(router)).toBe("/new/poster?submissionId=notice-903"),
    );
  });

  it("옛 상세·검토·기기·권한 주소도 새 주소로 간다", async () => {
    const cases = [
      ["/submissions/notice-901", "/mine/notice-901"],
      ["/reviews/notice-003", "/review/notice-003"],
      ["/displays", "/tv"],
      ["/users", "/settings/roles"],
    ] as const;
    for (const [from, target] of cases) {
      const { router, unmount } = renderRoute(from, { role: "SUPER_ADMIN" });
      await waitFor(() => expect(currentPath(router)).toBe(target));
      unmount();
    }
  });
});
