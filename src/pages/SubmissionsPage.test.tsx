import { screen, within } from "@testing-library/react";
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
      ziggleNoticeId: `notice-extra-${index}`,
      title: `추가 신청 ${index + 1}`,
      categoryId: "club",
      assetId: `asset-extra-${index}`,
      detailUrl: `https://ziggle.gistory.me/notice/extra-${index}`,
      startAt: new Date(TEST_NOW.getTime() + 86_400_000),
      endAt: new Date(TEST_NOW.getTime() + 7 * 86_400_000),
      targetGroupIds: [],
    });
  }
  return repositories;
}

/**
 * 신청 목록 (명세 FR-SUB-05, FR-DASH-02).
 * 실제 route로 띄워 URL 동기화와 pagination까지 확인한다.
 */
describe("신청 목록", () => {
  it("전체 신청이 pagination으로 접근 가능하다", async () => {
    const user = userEvent.setup();
    const repositories = await repositoriesWithManySubmissions();
    renderRoute("/submissions", { role: "SUBMITTER", repositories });

    const heading = await screen.findByRole("heading", { name: /\d+건/ });
    const total = Number(/(\d+)건/.exec(heading.textContent ?? "")?.[1]);
    expect(total).toBeGreaterThan(10);

    // 첫 페이지는 10건, 더 보기를 누르면 나머지가 이어 붙는다.
    // 푸터 같은 셸의 목록은 세지 않는다.
    const listItems = () =>
      within(screen.getByRole("main")).getAllByRole("listitem");
    expect(listItems()).toHaveLength(10);

    await user.click(screen.getByRole("button", { name: /더 보기/ }));
    await screen.findByText(`내 신청 ${total}건`);
    expect(listItems()).toHaveLength(total);
    expect(screen.queryByRole("button", { name: /더 보기/ })).toBeNull();
  });

  it("다른 사람의 신청은 내 신청 목록에 나오지 않는다", async () => {
    renderRoute("/submissions", { role: "SUBMITTER" });

    await screen.findByRole("heading", { name: /\d+건/ });
    // fixture의 지스트신문 신청은 다른 학생이 올렸다.
    expect(screen.queryByText("지스트신문 22기 기자단 모집")).toBeNull();
    expect(screen.getByText("슈퍼-피셜 신입 부원 모집")).toBeInTheDocument();
  });

  it("상태 탭이 URL에 반영되고 직접 접근해도 같은 화면이 나온다", async () => {
    const user = userEvent.setup();
    const { router } = renderRoute("/submissions", { role: "SUBMITTER" });

    await screen.findByRole("heading", { name: /\d+건/ });
    await user.click(screen.getByRole("tab", { name: /^반려/ }));

    expect(currentPath(router)).toBe("/submissions?status=rejected");
    expect(await screen.findByText(/반려 \d+건/)).toBeInTheDocument();

    // 반려 탭에는 반려 건만 있다.
    const rows = within(screen.getByRole("main")).getAllByRole("listitem");
    for (const row of rows) {
      expect(within(row).getByText("반려됨")).toBeInTheDocument();
    }
  });

  it("URL로 직접 들어가면 해당 탭이 활성화된다", async () => {
    renderRoute("/submissions?status=stopped", { role: "SUBMITTER" });

    expect(await screen.findByText(/중단\/취소 \d+건/)).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: /^중단\/취소/ }),
    ).toHaveAttribute("aria-selected", "true");
  });

  it("알 수 없는 status 값은 전체 탭으로 돌아간다", async () => {
    renderRoute("/submissions?status=bogus", { role: "SUBMITTER" });

    expect(await screen.findByText(/신청 \d+건/)).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /^전체/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("행을 누르면 신청 상세로 간다", async () => {
    renderRoute("/submissions", { role: "SUBMITTER" });
    await screen.findByRole("heading", { name: /\d+건/ });

    const links = screen.getAllByRole("link");
    const rowLink = links.find((link) =>
      link.getAttribute("href")?.startsWith("/submissions/"),
    );
    expect(rowLink).toBeDefined();
  });

  it("탭마다 서버 요약의 건수를 붙인다", async () => {
    renderRoute("/submissions", { role: "SUBMITTER" });

    // 정하윤의 fixture: 반려 1건, 중단 1건(취소 0건)
    expect(
      await screen.findByRole("tab", { name: "반려 1건" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "중단/취소 1건" })).toBeInTheDocument();
  });

  it("화살표 키로 탭을 옮긴다", async () => {
    const user = userEvent.setup();
    const { router } = renderRoute("/submissions", { role: "SUBMITTER" });
    const all = await screen.findByRole("tab", { name: /^전체/ });

    all.focus();
    await user.keyboard("{ArrowRight}");

    expect(currentPath(router)).toBe("/submissions?status=draft");
    expect(screen.getByRole("tab", { name: /^작성 중/ })).toHaveFocus();
  });
});

describe("관리자의 전체 신청", () => {
  it("전체 신청으로 바꾸면 남의 신청도 보이고, 누르면 검토 화면으로 간다", async () => {
    const user = userEvent.setup();
    const { router } = renderRoute("/submissions", { role: "REVIEWER" });
    await screen.findByRole("heading", { name: /내 신청 \d+건/ });

    await user.click(screen.getByRole("button", { name: "전체 신청" }));

    expect(currentPath(router)).toBe("/submissions?scope=all");
    const row = await screen.findByRole("link", { name: /VESPER 피아노 정기공연/ });
    // 게시 중인 남의 신청 → 중단할 수 있는 검토 화면
    expect(row).toHaveAttribute("href", "/reviews/notice-001");
  });

  it("게시자는 scope=all 주소로 와도 내 신청만 본다", async () => {
    renderRoute("/submissions?scope=all", { role: "SUBMITTER" });

    expect(
      await screen.findByRole("heading", { name: /내 신청 \d+건/ }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "전체 신청" })).toBeNull();
  });
});

