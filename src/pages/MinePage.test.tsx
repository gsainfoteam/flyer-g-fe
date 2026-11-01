import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { createMemoryHeartbeatLog } from "@/mocks/heartbeats";
import { createMockRepositories } from "@/mocks/repositories";
import { MOCK_USERS } from "@/mocks/users";
import { createFixedClock } from "@/shared/lib/clock";
import { TEST_NOW, currentPath, renderRoute } from "@/test/render-route";

/** 게시자 한 명의 신청을 한 페이지(10건)보다 많게 만든다. */
async function repositoriesWithManySubmissions() {
  const repositories = createMockRepositories({
    clock: createFixedClock(TEST_NOW),
    session: () => MOCK_USERS.SUBMITTER,
    heartbeats: createMemoryHeartbeatLog(),
  });
  for (let index = 0; index < 6; index += 1) {
    await repositories.submissions.create({
      title: `추가 신청 ${index + 1}`,
      categoryId: "club",
      assetId: `asset-extra-${index}`,
      detailUrl: `https://ziggle.gistory.me/notice/extra-${index}`,
      organizerName: null,
      subtitle: null,
      location: null,
      description: null,
      startAt: new Date(TEST_NOW.getTime() + 2 * 86_400_000),
      endAt: new Date(TEST_NOW.getTime() + 7 * 86_400_000),
      targetGroupIds: [],
    });
  }
  return repositories;
}

/**
 * 내 컨텐츠 (기획 4-1). 실제 route로 띄워 URL 동기화와 pagination까지 확인한다.
 *
 * 넓은 화면의 표와 좁은 화면의 목록이 함께 그려지고 CSS로 하나만 보인다. 그래서
 * 행은 표(`row`)로 센다.
 */
const tableRows = () =>
  within(screen.getByRole("table")).getAllByRole("row").slice(1);

describe("내 컨텐츠", () => {
  it("모든 컨텐츠가 pagination으로 접근 가능하다", async () => {
    const user = userEvent.setup();
    const repositories = await repositoriesWithManySubmissions();
    renderRoute("/mine", { role: "SUBMITTER", repositories });

    const all = await screen.findByRole("tab", { name: /^전체\s*\d+$/ });
    const total = Number(/(\d+)/.exec(all.textContent ?? "")?.[1]);
    expect(total).toBeGreaterThan(10);

    await screen.findByRole("table");
    expect(tableRows()).toHaveLength(10);

    await user.click(screen.getByRole("button", { name: /더 보기/ }));
    await waitFor(() => expect(tableRows()).toHaveLength(total));
    expect(screen.queryByRole("button", { name: /더 보기/ })).toBeNull();
  });

  it("다른 사람의 컨텐츠는 나오지 않는다", async () => {
    renderRoute("/mine", { role: "SUBMITTER" });

    await screen.findByRole("table");
    // fixture의 지스트신문 신청은 다른 학생이 올렸다.
    expect(screen.queryAllByText("지스트신문 22기 기자단 모집")).toHaveLength(0);
    expect(
      screen.getAllByText("슈퍼-피셜 신입 부원 모집").length,
    ).toBeGreaterThan(0);
  });

  it("탭은 전체 · 진행 중 · 지난 것이고 URL에 남는다", async () => {
    const user = userEvent.setup();
    const { router } = renderRoute("/mine", { role: "SUBMITTER" });

    await screen.findByRole("table");
    await user.click(screen.getByRole("tab", { name: /^지난 것/ }));

    expect(currentPath(router)).toBe("/mine?view=past");
    await waitFor(() => {
      for (const row of tableRows()) {
        expect(row).toHaveTextContent(/게시 끝|취소/);
      }
    });
  });

  it("탭마다 서버 요약의 건수를 붙인다", async () => {
    renderRoute("/mine?view=active", { role: "SUBMITTER" });

    const active = await screen.findByRole("tab", { name: /^진행 중\s*\d+$/ });
    expect(active).toHaveAttribute("aria-selected", "true");
    // 정하윤의 fixture: 취소 1건, 게시 끝 1건이 지난 것이다.
    expect(
      screen.getByRole("tab", { name: /^지난 것\s*2$/ }),
    ).toBeInTheDocument();
  });

  it("반려된 컨텐츠는 할 일 칸에서 고쳐서 다시 내러 간다", async () => {
    renderRoute("/mine", { role: "SUBMITTER" });
    await screen.findByRole("table");

    const table = within(screen.getByRole("table"));
    const fix = table.getAllByRole("link", { name: "고쳐서 다시 내기" });
    expect(fix.length).toBeGreaterThan(0);
    expect(fix[0]!.getAttribute("href")).toMatch(
      /^\/new\/poster\?submissionId=/,
    );
    // 제목을 누르면 상세로 간다.
    const title = table
      .getAllByRole("link")
      .find((link) => link.getAttribute("href")?.startsWith("/mine/"));
    expect(title).toBeDefined();
  });
});
