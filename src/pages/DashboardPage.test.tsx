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
      await screen.findByRole("heading", { name: "무엇을 올릴까요?" }),
    ).toBeInTheDocument();
    expect(listPending).not.toHaveBeenCalled();
    expect(
      screen.queryByText("내용을 불러오지 못했어요"),
    ).not.toBeInTheDocument();
  });

  it("처음 온 사람에게는 세 종류와 진행 순서를 크게 보여주고 빈 목록은 그리지 않는다", async () => {
    renderRoute("/", { role: "SUBMITTER", repositories: repositoriesForNewUser() });

    expect(
      await screen.findByRole("heading", { name: "무엇을 TV에 띄워 볼까요?" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "올리면 이렇게 진행돼요" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "내 컨텐츠" })).toBeNull();
  });

  it("세 종류 모두 올리는 화면으로 간다", async () => {
    renderRoute("/", { role: "SUBMITTER" });
    await screen.findByRole("heading", { name: "무엇을 올릴까요?" });

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
    expect(screen.queryByText("곧 열려요")).toBeNull();
  });

  it("반려·중단된 컨텐츠는 고쳐서 다시 내러 가는 길을 둔다", async () => {
    renderRoute("/", { role: "SUBMITTER" });

    const mine = (
      await screen.findByRole("heading", { name: "내 컨텐츠" })
    ).closest("section")!;
    const fixes = within(mine).getAllByRole("link", {
      name: "고쳐서 다시 내기",
    });
    expect(fixes.map((link) => link.getAttribute("href"))).toEqual(
      expect.arrayContaining([
        "/new/poster?submissionId=notice-901",
        "/new/poster?submissionId=notice-903",
      ]),
    );
  });

  it("지금 TV에·오늘의 퀴즈 칸은 두지 않는다", async () => {
    renderRoute("/", { role: "SUBMITTER" });
    await screen.findByRole("heading", { name: "내 컨텐츠" });

    expect(screen.queryByRole("heading", { name: "지금 TV에" })).toBeNull();
    expect(screen.queryByText("오늘의 퀴즈")).toBeNull();
  });
});

describe("하우스 관리자 홈", () => {
  it("오래 기다린 건은 그 건의 심사 화면으로 간다", async () => {
    renderRoute("/", { role: "REVIEWER" });

    const queue = (
      await screen.findByRole("heading", { name: "오래 기다린 순" })
    ).closest("section")!;
    const rows = within(queue)
      .getAllByRole("link")
      .filter((link) => link.getAttribute("href")?.startsWith("/review/"));
    expect(rows.length).toBeGreaterThan(0);
  });

  it("꺼진 TV를 이름으로 알린다", async () => {
    renderRoute("/", { role: "REVIEWER" });
    expect(
      await screen.findByText(/TV 켜짐 · B동 로비 꺼짐/),
    ).toBeInTheDocument();
  });

  it("처음 안내는 닫으면 다시 나오지 않는다", async () => {
    const user = userEvent.setup();
    const first = renderRoute("/", { role: "REVIEWER" });
    await user.click(await screen.findByRole("button", { name: "안내 닫기" }));
    expect(screen.queryByRole("note")).toBeNull();
    first.unmount();

    renderRoute("/", { role: "REVIEWER" });
    await screen.findByRole("heading", { name: "심사 대기", level: 1 });
    expect(screen.queryByRole("button", { name: "안내 닫기" })).toBeNull();
  });
});

describe("운영자 홈", () => {
  it("확인할 것에 꺼진 TV를 바로 가는 길과 함께 둔다", async () => {
    renderRoute("/", { role: "SUPER_ADMIN" });

    const checks = (
      await screen.findByRole("heading", { name: /확인할 것/ })
    ).closest("section")!;
    const offline = await within(checks).findByRole("link", {
      name: /B동 로비 꺼짐/,
    });
    expect(offline).toHaveAttribute("href", "/tv");
    expect(offline).toHaveTextContent("26분째 연결 없음");
  });

  it("TV 지금에 기기마다 켜짐·꺼짐을 보여준다", async () => {
    renderRoute("/", { role: "SUPER_ADMIN" });

    const now = (
      await screen.findByRole("heading", { name: "TV 지금" })
    ).closest("section")!;
    expect(await within(now).findByText(/B동 로비/)).toBeInTheDocument();
    expect(within(now).getByText(/A동 로비/)).toBeInTheDocument();
    expect(within(now).getAllByText(/연결 없음/).length).toBeGreaterThan(0);
  });

  it("운영자도 심사하므로 심사 대기를 작게 둔다", async () => {
    renderRoute("/", { role: "SUPER_ADMIN" });
    const card = (
      await screen.findByRole("heading", { name: "심사 대기" })
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

    const section = (
      await screen.findByRole("heading", { name: "TV 지금" })
    ).closest("section")!;
    expect(await within(section).findByText(/1\/2 켜짐/)).toBeInTheDocument();
    expect(within(section).getByText(/화면 끔 1/)).toBeInTheDocument();
    expect(within(section).queryByText(/연결 없음/)).toBeNull();
    expect(screen.queryByText(/B동 로비 꺼짐/)).toBeNull();
  });

  it("하우스 관리자 홈은 꺼짐이 아니라 화면 끔으로 센다", async () => {
    renderRoute("/", {
      role: "REVIEWER",
      repositories: await repositoriesWithSleepingTv(),
    });

    expect(
      await screen.findByText("TV 켜짐 · 화면 끔 1대"),
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
    await screen.findByRole("heading", { name: "무엇을 올릴까요?" });
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

