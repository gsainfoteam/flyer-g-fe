import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SignageSubmissionExpanded } from "@/entities/submission";
import { UNDO_WINDOW_MS } from "@/features/reviews/model/use-deferred-decisions";
import { createMockRepositories } from "@/mocks/repositories";
import { createFixedClock } from "@/shared/lib/clock";
import { TEST_NOW, currentPath, renderRoute } from "@/test/render-route";

/**
 * 심사 한 화면 (기획 4-2, 명세 FR-REV-01 ~ FR-REV-05).
 * mock fixture 대기열: notice-003(가장 오래) → notice-005 → notice-905.
 */
const PENDING_ID = "notice-003";
const TITLE = "지스트신문 22기 기자단 모집";

function reviewRepositories() {
  return createMockRepositories({ clock: createFixedClock(TEST_NOW) });
}

/** 대기 건을 다른 종류로 바꿔 읽게 한다. mock에는 아직 이벤트·제보 예시가 없다. */
function repositoriesShowing(patch: Partial<SignageSubmissionExpanded>) {
  const repositories = reviewRepositories();
  const getById = repositories.submissions.getById.bind(
    repositories.submissions,
  );
  repositories.submissions.getById = async (id, signal) => {
    const submission = await getById(id, signal);
    return id === PENDING_ID ? { ...submission, ...patch } : submission;
  };
  return repositories;
}

/** 결정은 되돌리기 시간이 지나야 서버로 간다. */
async function passUndoWindow() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(UNDO_WINDOW_MS);
  });
}

const statusOf = async (
  repositories: ReturnType<typeof reviewRepositories>,
  id = PENDING_ID,
) => (await repositories.submissions.getById(id)).status;

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});
afterEach(() => {
  vi.useRealTimers();
});

const setupUser = () =>
  userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

describe("심사 대기열", () => {
  it("오래 기다린 순으로 보여주고, 주소에 id가 없으면 맨 앞 건을 오른쪽에 띄운다", async () => {
    renderRoute("/review", { role: "REVIEWER" });

    expect(
      await screen.findByRole("heading", { name: TITLE, level: 2 }),
    ).toBeInTheDocument();
    expect(screen.getByText(/대기 3건 · 가장 오래 기다림/)).toBeInTheDocument();

    const queue = within(screen.getByRole("region", { name: "대기열" }));
    const links = queue.getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/review/notice-003",
      "/review/notice-005",
      "/review/notice-905",
    ]);
    // 누가 올린 무슨 종류인지 함께 보인다.
    expect(queue.getByText("포스터 · 최기자")).toBeInTheDocument();
  });

  it("종류 탭은 서버가 거르고 주소에 남는다", async () => {
    const user = setupUser();
    const { router } = renderRoute("/review", { role: "REVIEWER" });
    await screen.findByRole("heading", { name: TITLE, level: 2 });

    await user.click(screen.getByRole("tab", { name: "이벤트 0" }));

    expect(currentPath(router)).toBe("/review?type=EVENT_BANNER");
    expect(await screen.findByText("기다리는 이벤트 없음")).toBeInTheDocument();
    expect(screen.getByText("모두 처리함")).toBeInTheDocument();
  });

  it("J·K로 대기열을 오가고 S로 다음 건으로 미룬다", async () => {
    const user = setupUser();
    const { router } = renderRoute("/review", { role: "REVIEWER" });
    await screen.findByRole("heading", { name: TITLE, level: 2 });

    await user.keyboard("j");
    expect(currentPath(router)).toBe("/review/notice-005");
    await user.keyboard("j");
    expect(currentPath(router)).toBe("/review/notice-905");
    await user.keyboard("k");
    expect(currentPath(router)).toBe("/review/notice-005");
    await user.keyboard("s");
    expect(currentPath(router)).toBe("/review/notice-905");
  });

  it("게시자 역할은 심사 화면에 들어갈 수 없다", async () => {
    renderRoute(`/review/${PENDING_ID}`, { role: "SUBMITTER" });

    expect(
      await screen.findByText("이 화면을 볼 권한이 없어요"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /승인/ })).toBeNull();
  });
});

describe("고른 건", () => {
  it("검토 근거를 한 칸에 보여준다", async () => {
    renderRoute(`/review/${PENDING_ID}`, { role: "REVIEWER" });

    expect(
      await screen.findByRole("heading", { name: TITLE, level: 2 }),
    ).toBeInTheDocument();
    expect(screen.getByText(/검토 버전 v1/)).toBeInTheDocument();
    expect(screen.getByText("원본 포스터")).toBeInTheDocument();
    expect(screen.getByText("TV 미리보기")).toBeInTheDocument();
    expect(screen.getByText("처리 이력")).toBeInTheDocument();
    expect(screen.getByText("대상 위치").nextElementSibling).toHaveTextContent(
      "학사기숙사 A동",
    );

    const original = screen.getByRole("link", { name: /새 창에서 확인/ });
    expect(original).toHaveAttribute("target", "_blank");
    expect(original.getAttribute("rel")).toContain("noreferrer");
  });

  it("승인하면 바로 다음 건으로 넘어가고, 5초 뒤에 서버로 보낸다", async () => {
    const user = setupUser();
    const repositories = reviewRepositories();
    const { router } = renderRoute(`/review/${PENDING_ID}`, {
      role: "REVIEWER",
      repositories,
    });
    await screen.findByRole("heading", { name: TITLE, level: 2 });

    await user.keyboard("a");

    expect(currentPath(router)).toBe("/review/notice-005");
    expect(await screen.findByText(`승인 · ${TITLE}`)).toBeInTheDocument();
    expect(
      within(screen.getByRole("region", { name: "대기열" })).queryByText(TITLE),
    ).toBeNull();
    expect(await statusOf(repositories)).toBe("PENDING_REVIEW");

    await passUndoWindow();
    // 시작 시각이 미래라 서버가 SCHEDULED로 정한다.
    await waitFor(async () =>
      expect(await statusOf(repositories)).toBe("SCHEDULED"),
    );
  });

  it("되돌리면 보내지 않고 대기열에 되돌린다", async () => {
    const user = setupUser();
    const repositories = reviewRepositories();
    renderRoute(`/review/${PENDING_ID}`, { role: "REVIEWER", repositories });
    await screen.findByRole("heading", { name: TITLE, level: 2 });

    await user.click(screen.getByRole("button", { name: /승인/ }));
    await user.click(await screen.findByRole("button", { name: "되돌리기" }));
    await passUndoWindow();

    expect(await statusOf(repositories)).toBe("PENDING_REVIEW");
    expect(
      within(screen.getByRole("region", { name: "대기열" })).getByText(TITLE),
    ).toBeInTheDocument();
  });

  it("반려는 분류와 사유가 있어야 하고, 분류는 숫자 키로 고른다", async () => {
    const user = setupUser();
    const repositories = reviewRepositories();
    renderRoute(`/review/${PENDING_ID}`, { role: "REVIEWER", repositories });
    await screen.findByRole("heading", { name: TITLE, level: 2 });

    await user.keyboard("r");
    const dialog = await screen.findByRole("dialog");
    const confirm = within(dialog).getByRole("button", { name: "반려" });
    expect(confirm).toBeDisabled();

    // 포스터 사유 순서: 저해상도 · 비율 문제 · 정보 불일치 …
    await user.keyboard("3");
    expect(within(dialog).getByRole("combobox")).toHaveTextContent(
      "정보 불일치",
    );
    expect(confirm).toBeDisabled();

    await user.type(
      within(dialog).getByRole("textbox"),
      "포스터 마감일이 공지와 다릅니다.",
    );
    await user.click(confirm);
    await passUndoWindow();

    await waitFor(async () =>
      expect(await statusOf(repositories)).toBe("REJECTED"),
    );
    // 반려 사유가 처리 이력에 남는다.
    const history = await repositories.reviews.listHistory(PENDING_ID);
    expect(history.at(-1)).toMatchObject({
      type: "REJECTED",
      actorName: "이수현",
      comment: "포스터 마감일이 공지와 다릅니다.",
    });
  });

  it("기타로 반려하려면 무엇이 문제인지 10자 이상 적어야 한다", async () => {
    const user = setupUser();
    renderRoute(`/review/${PENDING_ID}`, { role: "REVIEWER" });

    await user.click(await screen.findByRole("button", { name: /반려/ }));
    const dialog = await screen.findByRole("dialog");
    const confirm = within(dialog).getByRole("button", { name: "반려" });

    await user.click(within(dialog).getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "기타" }));
    await user.type(within(dialog).getByRole("textbox"), "별로예요");
    expect(confirm).toBeDisabled();

    await user.type(
      within(dialog).getByRole("textbox"),
      " 포스터 글씨가 안 보여요",
    );
    expect(confirm).toBeEnabled();
  });

  it("다른 관리자가 먼저 처리했으면 보낼 때 실패를 알린다", async () => {
    const user = setupUser();
    const repositories = reviewRepositories();
    renderRoute(`/review/${PENDING_ID}`, { role: "REVIEWER", repositories });
    await screen.findByRole("heading", { name: TITLE, level: 2 });

    // 화면이 열린 사이 다른 관리자가 처리한다.
    const current = await repositories.submissions.getById(PENDING_ID);
    await repositories.reviews.approve({
      submissionId: PENDING_ID,
      revision: current.version,
    });

    await user.keyboard("a");
    await passUndoWindow();

    expect(await screen.findByText("승인하지 못했어요")).toBeInTheDocument();
    expect(
      screen.getByText(/다른 관리자가 먼저 처리했거나/),
    ).toBeInTheDocument();
  });

  it("게시 중인 건은 사유와 함께 중단할 수 있다", async () => {
    const user = setupUser();
    const repositories = reviewRepositories();
    // fixture notice-001은 PUBLISHED다. 대기열에는 없지만 오른쪽에서 볼 수 있다.
    renderRoute("/review/notice-001", { role: "REVIEWER", repositories });

    await user.click(
      await screen.findByRole("button", { name: "게시 중단하기" }),
    );
    expect(screen.queryByRole("button", { name: /승인/ })).toBeNull();
    const dialog = await screen.findByRole("dialog");
    const confirm = within(dialog).getByRole("button", { name: "게시 중단" });
    expect(confirm).toBeDisabled();

    await user.type(
      within(dialog).getByRole("textbox"),
      "행사가 취소되어 내립니다.",
    );
    await user.click(confirm);

    await waitFor(async () =>
      expect(await statusOf(repositories, "notice-001")).toBe("SUSPENDED"),
    );
  });

  it("제보는 말머리와 본문을 보여주고 포스터 칸은 그리지 않는다", async () => {
    renderRoute(`/review/${PENDING_ID}`, {
      role: "REVIEWER",
      repositories: repositoriesShowing({
        type: "STORY",
        requesterId: null,
        requesterName: null,
        categoryId: null,
        categoryName: null,
        posterUrl: null,
        posterThumbUrl: null,
        posterWidth: null,
        posterHeight: null,
        detailUrl: null,
        story: {
          tag: "PRAISE",
          body: "3층 정수기 고쳐 주신 분 감사합니다",
          storyNumber: null,
        },
      }),
    });

    const tag = await screen.findByText("말머리");
    expect(tag.nextElementSibling).toHaveTextContent("칭찬");
    expect(screen.getByText("본문").nextElementSibling).toHaveTextContent(
      "3층 정수기 고쳐 주신 분 감사합니다",
    );
    expect(screen.getByText(/작성자 가림 신청/)).toBeInTheDocument();
    expect(screen.queryByText("원본 포스터")).toBeNull();
    expect(screen.queryByText("상세 링크")).toBeNull();
  });

  it("이벤트는 받는 사람·문구·사진 동의를 보여준다", async () => {
    renderRoute(`/review/${PENDING_ID}`, {
      role: "REVIEWER",
      repositories: repositoriesShowing({
        type: "EVENT_BANNER",
        categoryId: null,
        categoryName: null,
        posterUrl: null,
        posterThumbUrl: null,
        posterWidth: null,
        posterHeight: null,
        detailUrl: null,
        eventBanner: {
          mode: "TEMPLATE",
          occasion: "BIRTHDAY",
          recipient: "지민",
          message: "스물한 살 생일 축하해!",
          sender: "3층 친구들",
          photoAssetId: "asset-photo",
          photoUrl: "https://example.com/photo.jpg",
          photoConsent: true,
          assetId: null,
          assetUrl: null,
        },
      }),
    });

    const format = await screen.findByText("형식");
    expect(format.nextElementSibling).toHaveTextContent("문구로 만들기 · 생일");
    expect(screen.getByText("받는 사람").nextElementSibling).toHaveTextContent(
      "지민",
    );
    expect(screen.getByText("문구").nextElementSibling).toHaveTextContent(
      "스물한 살 생일 축하해!",
    );
    expect(screen.getByText("보낸 사람").nextElementSibling).toHaveTextContent(
      "3층 친구들",
    );
    expect(
      screen.getByText("사진", { selector: "dt" }).nextElementSibling,
    ).toHaveTextContent("있음 · 받는 사람 동의");
    expect(screen.queryByText("카테고리")).toBeNull();
  });

  it("영상 포스터는 대표 프레임 대신 영상을 재생할 수 있다", async () => {
    renderRoute(`/review/${PENDING_ID}`, {
      role: "REVIEWER",
      repositories: repositoriesShowing({
        posterKind: "VIDEO",
        posterDurationMs: 15_000,
        posterVideoUrl: "https://example.com/poster.mp4",
      }),
    });

    expect(await screen.findByText("원본 영상")).toBeInTheDocument();
    // TV 미리보기도 영상을 튼다. 조작 막대가 있는 것이 원본이다.
    const video = document.querySelector("video[controls]");
    expect(video).toHaveAttribute("src", "https://example.com/poster.mp4");
    expect(video).toHaveAttribute("controls");
  });
});

describe("소식 제보 심사", () => {
  async function withStory(body = "세탁실 건조기가 고쳐졌어요. 고맙습니다!") {
    const repositories = reviewRepositories();
    const story = await repositories.submissions.createContent({
      type: "STORY",
      story: { tag: "PRAISE", body },
    });
    return { repositories, story };
  }

  it("제보 탭은 목록에서 본문을 보고 바로 승인한다", async () => {
    const user = setupUser();
    const { repositories, story } = await withStory();
    renderRoute("/review?type=STORY", { role: "REVIEWER", repositories });

    const queue = within(await screen.findByRole("region", { name: "대기열" }));
    expect(
      await queue.findByText("세탁실 건조기가 고쳐졌어요. 고맙습니다!"),
    ).toBeInTheDocument();
    expect(queue.getByText("제보 · 작성자 가림")).toBeInTheDocument();

    await user.click(queue.getByRole("button", { name: "승인" }));
    await passUndoWindow();

    await waitFor(async () =>
      expect(await statusOf(repositories, story.id)).toBe("PUBLISHED"),
    );
  });

  it("작성자는 운영자만 열람하고, 하우스 관리자에게는 버튼이 없다", async () => {
    const user = setupUser();
    const { repositories, story } = await withStory();
    const reveal = vi.spyOn(repositories.submissions, "revealAuthor");

    const { unmount } = renderRoute(`/review/${story.id}`, {
      role: "REVIEWER",
      repositories,
    });
    expect(await screen.findByText(/작성자 가림/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "보기" })).toBeNull();
    unmount();

    renderRoute(`/review/${story.id}`, { role: "SUPER_ADMIN", repositories });
    await user.click(await screen.findByRole("button", { name: "보기" }));
    expect(
      await screen.findByText("정하윤 (user-submitter@gist.ac.kr)"),
    ).toBeInTheDocument();
    expect(reveal).toHaveBeenCalledTimes(1);
  });

  it("본문에 연락처가 있으면 짚어 준다", async () => {
    const { repositories, story } = await withStory(
      "우산 주우신 분 010-1234-5678로 연락 주세요.",
    );
    renderRoute(`/review/${story.id}`, { role: "REVIEWER", repositories });

    expect(
      await screen.findByText("전화번호나 메일 주소가 들어 있어요"),
    ).toBeInTheDocument();
  });
});
