import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createMemoryHeartbeatLog } from "@/mocks/heartbeats";
import { createMockRepositories } from "@/mocks/repositories";
import { MOCK_USERS } from "@/mocks/users";
import { ApiError } from "@/shared/api/error";
import { createFixedClock } from "@/shared/lib/clock";
import { TEST_NOW, renderRoute } from "@/test/render-route";

/** 역할별 첫 화면 (기획 4-0). */
function repositoriesWithForbiddenReviews() {
  const repositories = createMockRepositories({
    clock: createFixedClock(TEST_NOW),
    heartbeats: createMemoryHeartbeatLog(),
  });
  // 실제 서버는 사용자에게 심사 대기 목록을 403으로 거절한다.
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

/** 아무것도 올리지 않은 새 사용자 */
function repositoriesForNewUser() {
  return createMockRepositories({
    clock: createFixedClock(TEST_NOW),
    heartbeats: createMemoryHeartbeatLog(),
    session: () => ({
      id: "user-new",
      displayName: "새내기",
      email: "new@example.com",
      roles: ["SUBMITTER"],
      organizationIds: [],
    }),
  });
}

afterEach(() => {
  window.localStorage.clear();
});

describe("사용자 홈", () => {
  it("관리자 전용 심사 목록을 조회하지 않는다", async () => {
    const { repositories, listPending } = repositoriesWithForbiddenReviews();
    renderRoute("/", { role: "SUBMITTER", repositories });

    expect(
      await screen.findByRole("heading", { name: "무엇을 TV에 올릴까요?" }),
    ).toBeInTheDocument();
    expect(listPending).not.toHaveBeenCalled();
    expect(
      screen.queryByText("내용을 불러오지 못했습니다"),
    ).not.toBeInTheDocument();
  });

  it("처음 온 사람에게는 세 종류와 진행 순서를 크게 보여주고 빈 목록은 그리지 않는다", async () => {
    renderRoute("/", { role: "SUBMITTER", repositories: repositoriesForNewUser() });

    expect(
      await screen.findByRole("heading", { name: "무엇을 TV에 올릴까요?" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "게시 절차" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "내 콘텐츠" })).toBeNull();
  });

  it("세 종류 모두 올리는 화면으로 간다", async () => {
    renderRoute("/", { role: "SUBMITTER" });
    await screen.findByRole("heading", { name: "무엇을 TV에 올릴까요?" });

    expect(screen.getByRole("link", { name: /포스터/ })).toHaveAttribute(
      "href",
      "/new/poster",
    );
    expect(screen.getByRole("link", { name: /이벤트 배너/ })).toHaveAttribute(
      "href",
      "/new/event",
    );
    expect(screen.getByRole("link", { name: /소식 제보/ })).toHaveAttribute(
      "href",
      "/new/story",
    );
    expect(screen.queryByText("준비 중")).toBeNull();
  });

  it("반려·중단된 콘텐츠는 한 줄 알림으로 알리고, 내 콘텐츠 맨 위에서 고치러 간다", async () => {
    renderRoute("/", { role: "SUBMITTER" });

    // 올리기가 주인공이라 고칠 것은 위에 한 줄로만 알리고 표로 데려간다.
    const notice = await screen.findByRole("link", { name: /고칠 콘텐츠 \d+건/ });
    expect(notice).toHaveAttribute("href", "#my-contents");

    const mine = screen
      .getByRole("heading", { name: "내 콘텐츠" })
      .closest("section")!;
    expect(mine).toHaveAttribute("id", "my-contents");
    const fixes = within(mine).getAllByRole("link", {
      name: "고쳐서 다시 내기",
    });
    expect(fixes.map((link) => link.getAttribute("href"))).toEqual(
      expect.arrayContaining([
        "/new/poster?submissionId=notice-901",
        "/new/poster?submissionId=notice-903",
      ]),
    );
    // 고칠 것이 표 맨 위에 온다.
    const titles = within(mine).getAllByRole("listitem");
    expect(within(titles[0]!).getByRole("link", { name: /고쳐서 다시 내기|새로 쓰기/ })).toBeInTheDocument();
  });

  it("지금 TV에·오늘의 퀴즈 칸은 두지 않는다", async () => {
    renderRoute("/", { role: "SUBMITTER" });
    await screen.findByRole("heading", { name: "내 콘텐츠" });

    expect(screen.queryByRole("heading", { name: "지금 TV에" })).toBeNull();
    expect(screen.queryByText("오늘의 퀴즈")).toBeNull();
  });
});

describe("하우스 관리자 홈", () => {
  it("다음 차례 한 건을 크게 두고, 그다음 건들은 각 심사 화면으로 간다", async () => {
    renderRoute("/", { role: "REVIEWER" });

    expect(
      await screen.findByRole("link", { name: /심사 시작/ }),
    ).toHaveAttribute("href", expect.stringMatching(/^\/review\//));
    const next = screen.getByRole("heading", { name: "그다음" }).closest("section")!;
    const rows = within(next)
      .getAllByRole("link")
      .filter((link) => link.getAttribute("href")?.startsWith("/review/"));
    expect(rows.length).toBeGreaterThan(0);
  });

  it("처리 수·TV 상태·오늘 게시 시작·끝은 오늘 칸에 한 줄씩 둔다", async () => {
    renderRoute("/", { role: "REVIEWER" });
    const today = (
      await screen.findByRole("heading", { name: "오늘" })
    ).closest("section")!;
    expect(within(today).getByText("처리")).toBeInTheDocument();
    expect(within(today).getByText("TV")).toBeInTheDocument();
    expect(within(today).getByText("게시 시작·끝")).toBeInTheDocument();
  });

  it("꺼진 TV를 이름으로 알린다", async () => {
    renderRoute("/", { role: "REVIEWER" });
    expect(
      await screen.findByText("B동 로비 꺼짐"),
    ).toBeInTheDocument();
  });

  it("처음 안내는 닫으면 다시 나오지 않는다", async () => {
    const user = userEvent.setup();
    const first = renderRoute("/", { role: "REVIEWER" });
    await user.click(await screen.findByRole("button", { name: "안내 닫기" }));
    expect(screen.queryByRole("note")).toBeNull();
    first.unmount();

    renderRoute("/", { role: "REVIEWER" });
    await screen.findByRole("heading", { name: /^심사 대기/, level: 1 });
    expect(screen.queryByRole("button", { name: "안내 닫기" })).toBeNull();
  });
});

describe("운영자 홈", () => {
  it("TV 화면이 주인공이고, 꺼진 TV는 화면 자리에 이유와 바로 가는 길을 둔다", async () => {
    renderRoute("/", { role: "SUPER_ADMIN" });

    const screens = await screen.findByRole("list", { name: "TV 화면" });
    expect(await within(screens).findByText(/A동 로비/)).toBeInTheDocument();
    const offline = within(screens)
      .getByRole("heading", { name: "B동 로비" })
      .closest("li")!;
    expect(within(offline).getByText("26분째 연결 없음")).toBeInTheDocument();
    expect(
      within(offline).getByRole("link", { name: "기기 보기" }),
    ).toHaveAttribute("href", "/tv");
    // 제목 줄에도 꺼진 TV를 짚는다.
    expect(screen.getByText("B동 로비 꺼짐")).toBeInTheDocument();
  });

  it("TV마다 편성 화면으로 가는 길이 있다", async () => {
    renderRoute("/", { role: "SUPER_ADMIN" });
    const screens = await screen.findByRole("list", { name: "TV 화면" });
    const lineups = within(screens).getAllByRole("link", { name: "편성" });
    expect(lineups[0]).toHaveAttribute(
      "href",
      expect.stringMatching(/^\/tv\/groups\//),
    );
  });

  it("오늘 TV에 지금 게시 중인 건수와 오늘 시작·끝을 둔다", async () => {
    renderRoute("/", { role: "SUPER_ADMIN" });
    const today = (
      await screen.findByRole("heading", { name: "오늘 TV" })
    ).closest("section")!;
    expect(within(today).getByText("게시 중")).toBeInTheDocument();
    expect(
      within(today).getByRole("link", { name: "전체 콘텐츠" }),
    ).toHaveAttribute("href", "/contents");
  });

  it("하우스 관리자 홈과 같은 이름으로 최근 처리를 보여준다", async () => {
    renderRoute("/", { role: "SUPER_ADMIN" });
    expect(
      await screen.findByRole("heading", { name: "최근 처리" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "최근 기록" })).toBeNull();
  });

  it("운영자도 심사하므로 심사 대기를 작게 둔다", async () => {
    renderRoute("/", { role: "SUPER_ADMIN" });
    const card = (
      await screen.findByRole("heading", { name: /^심사 대기 \d+건$/ })
    ).closest("section")!;
    expect(
      within(card).getByRole("link", { name: /오래된 것부터 심사/ }),
    ).toHaveAttribute("href", "/review");
  });
});

describe("화면 끔 시간의 TV (배포 ⑦)", () => {
  /** B동은 끊긴 기기다. TEST_NOW(서울 12:00)를 덮는 화면 끔 시간을 둔다. */
  async function repositoriesWithSleepingTv() {
    const repositories = createMockRepositories({
      clock: createFixedClock(TEST_NOW),
      heartbeats: createMemoryHeartbeatLog(),
    });
    await repositories.devices.update("house-b-lobby", {
      overrides: {
        settings: { quietHours: [{ start: "11:00", end: "13:00" }] },
      },
    });
    return repositories;
  }

  it("운영자 홈은 꺼진 TV로 알리지 않고 화면 끔으로 보여 준다", async () => {
    renderRoute("/", {
      role: "SUPER_ADMIN",
      repositories: await repositoriesWithSleepingTv(),
    });

    const screens = await screen.findByRole("list", { name: "TV 화면" });
    expect(await within(screens).findByText("화면 끔")).toBeInTheDocument();
    expect(within(screens).queryByText(/연결 없음/)).toBeNull();
    expect(screen.getByText(/화면 끔 1대/)).toBeInTheDocument();
    expect(screen.queryByText(/B동 로비 꺼짐/)).toBeNull();
  });

  it("하우스 관리자 홈은 꺼짐이 아니라 화면 끔으로 센다", async () => {
    renderRoute("/", {
      role: "REVIEWER",
      repositories: await repositoriesWithSleepingTv(),
    });

    expect(
      await screen.findByText("1/2 켜짐 · 화면 끔 1대"),
    ).toBeInTheDocument();
  });
});

describe("제보 (배포 ④)", () => {
  async function repositoriesWithStory() {
    // 작성자 본인에게만 신청자가 보인다. 화면의 사용자(정하윤)로 보고, 심사할 때만 바꾼다.
    let user = MOCK_USERS.SUBMITTER;
    const repositories = createMockRepositories({
      clock: createFixedClock(TEST_NOW),
      heartbeats: createMemoryHeartbeatLog(),
      session: () => user,
    });
    const story = await repositories.submissions.createContent({
      type: "STORY",
      story: { tag: "LOST_FOUND", body: "A동 로비에서 파란 우산을 주웠어요." },
    });
    const asReviewer = async <T,>(run: () => Promise<T>) => {
      user = MOCK_USERS.REVIEWER;
      try {
        return await run();
      } finally {
        user = MOCK_USERS.SUBMITTER;
      }
    };
    return { repositories, story, asReviewer };
  }

  it("사용자 홈은 지금 TV에 걸린 제보를 보여 주고, 없으면 칸을 그리지 않는다", async () => {
    const { repositories, story, asReviewer } = await repositoriesWithStory();
    const { unmount } = renderRoute("/", { role: "SUBMITTER", repositories });
    await screen.findByRole("heading", { name: "무엇을 TV에 올릴까요?" });
    expect(screen.queryByRole("heading", { name: "지금 TV의 제보" })).toBeNull();
    unmount();

    await asReviewer(() =>
      repositories.reviews.approve({
        submissionId: story.id,
        revision: story.version,
      }),
    );
    renderRoute("/", { role: "SUBMITTER", repositories });
    const section = (
      await screen.findByRole("heading", { name: "지금 TV의 제보" })
    ).closest("section")!;
    expect(
      within(section).getByText("A동 로비에서 파란 우산을 주웠어요."),
    ).toBeInTheDocument();
    expect(within(section).getByText("분실물")).toBeInTheDocument();
  });

  it("반려된 제보는 고치지 않고 새로 쓰러 간다", async () => {
    const { repositories, story, asReviewer } = await repositoriesWithStory();
    await asReviewer(() =>
      repositories.reviews.reject({
        submissionId: story.id,
        revision: story.version,
        reasonCode: "PERSONAL_INFO",
        comment: "누가 잃어버렸는지 알 수 있어요.",
      }),
    );
    renderRoute(`/mine/${story.id}`, { role: "SUBMITTER", repositories });

    expect(
      await screen.findByRole("link", { name: "새로 쓰기" }),
    ).toHaveAttribute("href", "/new/story");
    expect(screen.queryByRole("link", { name: /고쳐서 다시 내기/ })).toBeNull();
  });
});
