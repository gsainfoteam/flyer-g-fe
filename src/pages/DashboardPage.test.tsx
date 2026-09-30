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

    const link = await screen.findByRole("link", { name: "TV 미리보기 →" });
    expect(link.getAttribute("href")).toContain("preview=1");
  });

  it("하우스 관리자에게 끊긴 기기를 펼쳐 보여주고, 운영자에게 알리라고 안내한다", async () => {
    renderRoute("/", { role: "REVIEWER" });

    const panel = (await screen.findByText("26분째 끊김")).closest("section")!;
    const rows = within(panel).getAllByRole("listitem");
    // 끊긴 기기가 맨 위다.
    expect(rows[0]).toHaveTextContent("B동 로비");
    expect(rows[0]).toHaveTextContent("26분째 끊김");
    expect(rows[0]).toHaveTextContent("계속되면 운영자에게 알려 주세요");
    expect(rows[1]).toHaveTextContent("A동 로비");
    expect(rows[1]).toHaveTextContent("정상");
    // 하우스 관리자는 기기를 고칠 수 없다.
    expect(
      within(panel).queryByRole("link", { name: "기기 관리 →" }),
    ).not.toBeInTheDocument();
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
    expect(
      within(feed).getByText("게시 중단").closest("p"),
    ).toHaveTextContent("슈퍼-피셜 드로잉 원데이 클래스 게시 중단");
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

describe("하우스 관리자 홈", () => {
  it("검토 대기에서 고쳐서 다시 낸 신청을 알린다", async () => {
    renderRoute("/", { role: "REVIEWER" });

    const queue = (
      await screen.findByRole("heading", { name: /검토 대기/ })
    ).closest("section")!;
    const resubmitted = within(queue)
      .getByText("슈퍼-피셜 가을 전시 〈선 긋기〉")
      .closest("li")!;
    expect(resubmitted).toHaveTextContent("고쳐서 다시 냄");
    const first = within(queue)
      .getByText("지스트신문 22기 기자단 모집")
      .closest("li")!;
    expect(first).not.toHaveTextContent("다시 냄");
  });

  it("지금 게시 중은 곧 내려가는 것부터 보여준다", async () => {
    renderRoute("/", { role: "REVIEWER" });

    const onAir = (
      await screen.findByRole("heading", { name: /지금 게시 중/ })
    ).closest("section")!;
    const days = within(onAir)
      .getAllByText(/일 남음$/)
      .map((node) => Number.parseInt(node.textContent ?? "", 10));
    expect(days.length).toBeGreaterThan(0);
    expect(days).toEqual([...days].sort((a, b) => a - b));
  });

  it("최근 처리는 결정과 처리한 사람을 최신순으로 보여준다", async () => {
    renderRoute("/", { role: "REVIEWER" });

    const panel = (
      await screen.findByRole("heading", { name: "최근 처리" })
    ).closest("section")!;
    const rows = await within(panel).findAllByRole("listitem");
    expect(rows[0]).toHaveTextContent("슈퍼-피셜 드로잉 원데이 클래스");
    expect(rows[0]).toHaveTextContent("게시 중단 · 이수현");
  });

  it("오늘 바뀌는 게 없으면 다음 변경이 언제인지 알린다", async () => {
    renderRoute("/", { role: "REVIEWER" });

    expect(
      await screen.findByText("오늘은 바뀌는 게 없어요"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/^다음 변경: .+ 게시 (시작|종료)$/),
    ).toBeInTheDocument();
  });

  it("처리할 신청이 없으면 제목이 바뀌고 전체 신청 목록으로 안내한다", async () => {
    const repositories = createMockRepositories({
      clock: createFixedClock(TEST_NOW),
    });
    repositories.reviews.listPending = async () => ({
      items: [],
      nextCursor: null,
      totalCount: 0,
      serverTime: TEST_NOW,
    });
    const getSummary = repositories.submissions.getSummary;
    repositories.submissions.getSummary = async (params, signal) => ({
      ...(await getSummary(params, signal)),
      pendingReview: 0,
    });
    renderRoute("/", { role: "REVIEWER", repositories });

    expect(
      await screen.findByRole("heading", { name: "지금 처리할 신청이 없어요" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/^게시 중 \d+장$/)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "전체 신청 보기" }),
    ).toHaveAttribute("href", "/submissions?scope=all");
    expect(
      screen.getByText("검토할 신청을 모두 처리했어요"),
    ).toBeInTheDocument();
  });

  it("기기가 모두 정상이면 한 줄로 접는다", async () => {
    const repositories = createMockRepositories({
      clock: createFixedClock(TEST_NOW),
    });
    const list = repositories.devices.list;
    repositories.devices.list = async (signal) => {
      const devices = await list(signal);
      return {
        ...devices,
        items: devices.items.map((device) => ({
          ...device,
          status: "ONLINE" as const,
          lastSeenAt: devices.serverTime,
          lastRenderOkAt: devices.serverTime,
        })),
      };
    };
    renderRoute("/", { role: "REVIEWER", repositories });

    expect(
      await screen.findByRole("heading", { name: "디스플레이 2대 모두 정상" }),
    ).toBeInTheDocument();
  });
});

describe("운영자 홈", () => {
  it("제목에 검토 대기와 끊긴 TV를 한 줄로 말한다", async () => {
    renderRoute("/", { role: "SUPER_ADMIN" });

    expect(
      await screen.findByRole("heading", {
        name: "검토 대기 3건 · 연결 끊긴 TV 1대",
      }),
    ).toBeInTheDocument();
  });

  it("하우스 관리자 홈의 칸을 모두 두고 기기 관리로 가는 길을 더한다", async () => {
    renderRoute("/", { role: "SUPER_ADMIN" });

    for (const name of [
      /^검토 대기 \d+$/,
      "오늘 바뀌는 것",
      "최근 처리",
      /^지금 게시 중 \d+$/,
    ]) {
      expect(await screen.findByRole("heading", { name })).toBeInTheDocument();
    }
    expect(
      await screen.findByRole("link", { name: "기기 관리 →" }),
    ).toHaveAttribute("href", "/displays");
    expect(
      await screen.findByText(/전원·네트워크 확인 필요/),
    ).toBeInTheDocument();
  });

  it("게시판 현황은 TV마다 걸린 장수와 한 바퀴 시간을 지금 편성으로 계산한다", async () => {
    renderRoute("/", { role: "SUPER_ADMIN" });

    const panel = (
      await screen.findByRole("heading", { name: "게시판 현황" })
    ).closest("section")!;
    const row = (await within(panel).findByText("A동 로비")).closest("li")!;
    // fixture: 게시 중 2건 모두 대상 위치가 없어 모든 TV에 걸린다. 한 장씩, 10초.
    expect(row).toHaveTextContent("포스터 2장 · 한 장씩 · 10초마다 넘김");
    expect(row).toHaveTextContent("한 바퀴 20초");
    expect(row).toHaveTextContent("포스터당 시간당 약 180회");
    expect(
      within(panel).getByRole("link", { name: "화면 설정 →" }),
    ).toHaveAttribute("href", "/displays");
  });

  it("운영자 홈은 누적 노출 통계를 부르지 않는다", async () => {
    const repositories = createMockRepositories({
      clock: createFixedClock(TEST_NOW),
    });
    const getImpressions = vi.spyOn(repositories.stats, "getImpressions");
    renderRoute("/", { role: "SUPER_ADMIN", repositories });

    await screen.findByRole("heading", { name: "게시판 현황" });
    expect(getImpressions).not.toHaveBeenCalled();
  });

  it("연결은 됐는데 재생이 멈춘 TV를 알리고, 제목에서 확인할 TV로 센다", async () => {
    const repositories = createMockRepositories({
      clock: createFixedClock(TEST_NOW),
    });
    const list = repositories.devices.list;
    repositories.devices.list = async (signal) => {
      const devices = await list(signal);
      return {
        ...devices,
        items: devices.items.map((device) =>
          device.status === "ONLINE"
            ? {
                ...device,
                lastRenderOkAt: new Date(
                  devices.serverTime.getTime() - 30 * 60_000,
                ),
              }
            : device,
        ),
      };
    };
    renderRoute("/", { role: "SUPER_ADMIN", repositories });

    expect(
      await screen.findByRole("heading", {
        name: "검토 대기 3건 · 확인할 TV 2대",
      }),
    ).toBeInTheDocument();
    const warning = (await screen.findByText("30분째 재생 멈춤")).closest(
      "li",
    )!;
    expect(warning).toHaveTextContent("A동 로비");
    expect(warning).toHaveTextContent(
      "연결은 정상, 포스터 표시 안 됨 · TV 화면 확인 필요",
    );
  });
});
