import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createMemoryHeartbeatLog } from "@/mocks/heartbeats";
import { createMockRepositories } from "@/mocks/repositories";
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

  it("포스터만 지금 올릴 수 있고 이벤트·제보는 곧 열린다", async () => {
    renderRoute("/", { role: "SUBMITTER" });
    await screen.findByRole("heading", { name: "무엇을 올릴까요?" });

    expect(screen.getByRole("link", { name: /포스터/ })).toHaveAttribute(
      "href",
      "/new/poster",
    );
    expect(screen.getAllByText("곧 열려요")).toHaveLength(2);
    expect(screen.queryByRole("link", { name: /이벤트 배너/ })).toBeNull();
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
