import { screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { summarizeSubmissions } from "@/entities/submission";
import { createMockRepositories } from "@/mocks/repositories";
import { ApiError } from "@/shared/api/error";
import { createFixedClock } from "@/shared/lib/clock";
import { TEST_NOW, renderRoute } from "@/test/render-route";

function repositoriesWithForbiddenReviews() {
  const repositories = createMockRepositories({ clock: createFixedClock(TEST_NOW) });
  // 실제 서버는 게시자에게 승인 대기 목록을 403으로 거절한다.
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

describe("대시보드", () => {
  it("게시자 세션은 관리자 전용 승인 대기 목록을 조회하지 않는다", async () => {
    const { repositories, listPending } = repositoriesWithForbiddenReviews();
    renderRoute("/", { role: "SUBMITTER", repositories });

    expect(
      await screen.findByRole("link", { name: "새 게시 신청" }),
    ).toBeInTheDocument();
    expect(listPending).not.toHaveBeenCalled();
    expect(screen.queryByText("내용을 불러오지 못했어요")).not.toBeInTheDocument();
  });

  it("TV 미리보기 링크는 운영 모드가 아니라 미리보기 모드로 연다", async () => {
    renderRoute("/", { role: "REVIEWER" });

    const link = await screen.findByRole("link", { name: "미리보기 →" });
    expect(link.getAttribute("href")).toContain("preview=1");
  });

  it("관리자에게 기기 연결 상태를 보여준다", async () => {
    renderRoute("/", { role: "REVIEWER" });

    const panel = (
      await screen.findByRole("heading", { name: "디스플레이 2대" })
    ).closest("section")!;
    const rows = within(panel).getAllByRole("listitem");
    expect(rows[0]).toHaveTextContent("A동 로비");
    expect(rows[0]).toHaveTextContent("온라인");
    expect(rows[1]).toHaveTextContent("B동 로비");
    expect(rows[1]).toHaveTextContent("26분 전");
    expect(rows[1]).toHaveTextContent("오프라인");
  });

  it("게시자에게는 기기 상태를 조회하지도 보여주지도 않는다", async () => {
    const repositories = createMockRepositories({
      clock: createFixedClock(TEST_NOW),
    });
    const listDevices = vi.spyOn(repositories.devices, "list");
    renderRoute("/", { role: "SUBMITTER", repositories });

    await screen.findByRole("link", { name: "새 게시 신청" });
    expect(screen.queryByText(/디스플레이/)).toBeNull();
    expect(listDevices).not.toHaveBeenCalled();
  });

  it("고쳐야 할 신청 수는 불러온 목록이 아니라 서버 요약으로 센다", async () => {
    renderRoute("/", { role: "SUBMITTER" });

    // 정하윤: 반려 1건 + 게시 중단 1건
    expect(await screen.findByText("고쳐야 할 신청 2건")).toBeInTheDocument();
  });

  it("순서대로 검토 시작은 가장 오래 기다린 건의 검토 화면을 연다", async () => {
    renderRoute("/", { role: "REVIEWER" });

    expect(
      await screen.findByRole("link", { name: "순서대로 검토 시작" }),
    ).toHaveAttribute("href", "/reviews/notice-003");
  });
});


describe("게시자 홈", () => {
  it("반려·중단 건은 관리자가 남긴 사유와 고치러 가는 버튼을 보여준다", async () => {
    renderRoute("/", { role: "SUBMITTER" });

    // 카드와 최근 소식 양쪽에 같은 사유가 보인다.
    expect(
      (
        await screen.findAllByText(
          "“포스터의 신청 마감일과 Ziggle 공지 본문의 마감일이 다릅니다.”",
        )
      ).length,
    ).toBeGreaterThan(0);
    const fixLinks = await screen.findAllByRole("link", {
      name: "고쳐서 다시 내기",
    });
    expect(fixLinks.map((link) => link.getAttribute("href"))).toEqual(
      expect.arrayContaining([
        "/studio?submissionId=notice-901",
        "/studio?submissionId=notice-903",
      ]),
    );
  });

  it("게시 중인 카드는 TV에 나온 횟수와 TV 미리보기 링크를 둔다", async () => {
    renderRoute("/", { role: "SUBMITTER" });

    const card = (
      await screen.findByRole("link", { name: "VESPER 피아노 정기공연" })
    ).closest("li")!;
    expect(
      await within(card).findByText(/하루 평균 약 .+회/),
    ).toBeInTheDocument();
    expect(
      within(card).getByRole("link", { name: "TV 화면으로 보기 →" }),
    ).toHaveAttribute("href", expect.stringContaining("preview=1"));
    expect(within(card).getByText("QR 연결")).toBeInTheDocument();
  });

  it("최근 소식은 내 신청에 일어난 일을 최신순으로 보여준다", async () => {
    renderRoute("/", { role: "SUBMITTER" });

    const feed = (
      await screen.findByRole("heading", { name: "최근 소식" })
    ).closest("section")!;
    const items = await within(feed).findAllByRole("listitem");
    expect(items.length).toBeGreaterThan(0);
    expect(within(feed).getByText(/게시가/)).toHaveTextContent(
      "슈퍼-피셜 드로잉 원데이 클래스 게시가 중단됐어요",
    );
  });

  it("지난 신청에는 끝난 날과 노출 수를, 취소한 신청은 취소했다고 적는다", async () => {
    renderRoute("/", { role: "SUBMITTER" });

    const past = (
      await screen.findByRole("heading", { name: /지난 신청/ })
    ).closest("section")!;
    expect(within(past).getByText("게시 전에 취소함")).toBeInTheDocument();
    expect(
      await within(past).findByText(/종료 · .+회 노출/),
    ).toBeInTheDocument();
  });

  it("신청이 하나도 없으면 같은 칸에 신청 안내와 걸리는 곳을 채운다", async () => {
    const repositories = createMockRepositories({
      clock: createFixedClock(TEST_NOW),
    });
    repositories.submissions.getSummary = async () =>
      summarizeSubmissions([], TEST_NOW);
    repositories.submissions.list = async () => ({
      items: [],
      nextCursor: null,
      totalCount: 0,
      serverTime: TEST_NOW,
    });
    renderRoute("/", { role: "SUBMITTER", repositories });

    expect(
      await screen.findByRole("heading", {
        name: "포스터를 로비 TV에 걸어 보세요",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "첫 게시 신청하기" }),
    ).toHaveAttribute("href", "/studio");
    // 안내의 버튼과 겹치지 않게 머리의 신청 버튼은 두지 않는다.
    expect(
      screen.queryByRole("link", { name: "새 게시 신청" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("아직 소식이 없어요")).toBeInTheDocument();
    expect(await screen.findByText("학사기숙사 A동")).toBeInTheDocument();
  });
});
