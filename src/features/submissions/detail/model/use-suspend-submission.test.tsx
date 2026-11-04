import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { createMockRepositories } from "@/mocks/repositories";
import { MOCK_USERS } from "@/mocks/users";
import { ApiError } from "@/shared/api/error";
import { createFixedClock } from "@/shared/lib/clock";
import { TEST_NOW, renderRoute } from "@/test/render-route";

async function setup() {
  let session = MOCK_USERS.SUBMITTER;
  const repositories = createMockRepositories({
    clock: createFixedClock(TEST_NOW),
    session: () => session,
  });
  const story = await repositories.submissions.createContent({
    type: "STORY", story: { tag: "PRAISE", body: "세탁실을 고쳐주셔서 감사합니다!" },
  });
  session = MOCK_USERS.REVIEWER;
  const approved = await repositories.reviews.approve({ submissionId: story.id, revision: story.version });
  session = MOCK_USERS.SUBMITTER;
  return { repositories, approved };
}

async function openDialog() {
  const user = userEvent.setup();
  await user.click(await screen.findByRole("button", { name: "게시 중단하기" }));
  const dialog = within(await screen.findByRole("dialog"));
  return { user, input: dialog.getByRole("textbox", { name: /중단 사유/ }), confirm: dialog.getByRole("button", { name: "게시 중단" }) };
}

describe("작성자 게시 중단", () => {
  it("서버 시각 기준 게시 중인 본인 제보를 중단하고 상세·목록·요약·이력을 갱신한다", async () => {
    const { repositories, approved } = await setup();
    const summary = vi.spyOn(repositories.submissions, "getSummary");
    const list = vi.spyOn(repositories.submissions, "list");
    const history = vi.spyOn(repositories.reviews, "listHistory");
    const suspend = vi.spyOn(repositories.reviews, "suspend");
    const { router } = renderRoute(`/mine/${approved.id}`, { role: "SUBMITTER", repositories });
    const { user, input, confirm } = await openDialog();
    expect(confirm).toBeDisabled();
    fireEvent.change(input, { target: { value: "  행사가 취소되었습니다.  " } });
    await user.click(confirm);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.queryByRole("button", { name: "게시 중단하기" })).toBeNull();
    expect(await screen.findByText("게시 중단 · 정하윤")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "고쳐서 다시 내기" })).toBeNull();
    expect(suspend.mock.calls[0]?.[0]).toEqual({ submissionId: approved.id, reason: "행사가 취소되었습니다." });
    expect(suspend.mock.calls[0]?.[1]?.idempotencyKey).toMatch(/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/);
    expect(await repositories.submissions.getById(approved.id)).toMatchObject({ status: "SUSPENDED", lastDecision: "SUSPENDED", version: approved.version + 1 });
    expect(summary.mock.calls.length).toBeGreaterThan(1);
    expect(history.mock.calls.length).toBeGreaterThan(1);
    await router.navigate("/mine");
    await waitFor(() => expect(list).toHaveBeenCalled());
  });

  it("상세 serverTime이 종료 시각이면 오래된 요약 시각과 관계없이 중단 버튼을 숨긴다", async () => {
    const { repositories, approved } = await setup();
    const getById = repositories.submissions.getById;
    vi.spyOn(repositories.submissions, "getById").mockImplementation(async (...args) => ({
      ...await getById(...args), serverTime: approved.endAt!,
    }));
    renderRoute(`/mine/${approved.id}`, { role: "SUBMITTER", repositories });
    await screen.findByRole("heading", { name: "진행" });
    expect(screen.queryByRole("button", { name: "게시 중단하기" })).toBeNull();
    expect(screen.getByText("게시 끝")).toBeInTheDocument();
  });

  it("이력에 작성자 이름이 없으면 작성자로 표시한다", async () => {
    const { repositories, approved } = await setup();
    await repositories.reviews.suspend({ submissionId: approved.id, reason: "행사 취소" });
    const listHistory = repositories.reviews.listHistory;
    vi.spyOn(repositories.reviews, "listHistory").mockImplementation(async (...args) =>
      (await listHistory(...args)).map((event) => event.type === "SUSPENDED"
        ? { ...event, actorId: null, actorName: null } : event),
    );
    renderRoute(`/mine/${approved.id}`, { role: "SUBMITTER", repositories });
    expect(await screen.findByText("게시 중단 · 작성자")).toBeInTheDocument();
  });

  it("공백과 1001자는 차단하고 1000자는 허용하며 422 reason 오류를 표시한다", async () => {
    const { repositories, approved } = await setup();
    vi.spyOn(repositories.reviews, "suspend").mockRejectedValue(new ApiError({
      kind: "http", status: 422, code: "VALIDATION_FAILED", message: "입력 오류",
      fields: { reason: "중단 사유를 확인하세요." },
    }));
    renderRoute(`/mine/${approved.id}`, { role: "SUBMITTER", repositories });
    const { user, input, confirm } = await openDialog();
    fireEvent.change(input, { target: { value: "   " } });
    expect(confirm).toBeDisabled();
    fireEvent.change(input, { target: { value: "가".repeat(1001) } });
    expect(confirm).toBeDisabled();
    fireEvent.change(input, { target: { value: "가".repeat(1000) } });
    expect(confirm).toBeEnabled();
    await user.click(confirm);
    expect(await screen.findByText("중단 사유를 확인하세요.")).toBeInTheDocument();
    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  it("실패한 동일 요청은 같은 키로 재시도하고 사유 변경 시 새 키를 보낸다", async () => {
    const { repositories, approved } = await setup();
    const suspend = vi.spyOn(repositories.reviews, "suspend").mockRejectedValue(new ApiError({ kind: "network", code: "NETWORK_ERROR", message: "연결 오류" }));
    renderRoute(`/mine/${approved.id}`, { role: "SUBMITTER", repositories });
    const { user, input, confirm } = await openDialog();
    fireEvent.change(input, { target: { value: "행사 취소" } });
    await user.click(confirm);
    await waitFor(() => expect(confirm).toBeEnabled());
    await user.click(confirm);
    await waitFor(() => expect(suspend).toHaveBeenCalledTimes(2));
    expect(suspend.mock.calls[1]?.[1]?.idempotencyKey).toBe(suspend.mock.calls[0]?.[1]?.idempotencyKey);
    fireEvent.change(input, { target: { value: "행사 일정 변경" } });
    await user.click(confirm);
    await waitFor(() => expect(suspend).toHaveBeenCalledTimes(3));
    expect(suspend.mock.calls[2]?.[1]?.idempotencyKey).not.toBe(suspend.mock.calls[0]?.[1]?.idempotencyKey);
  });

  it("409이면 상세를 다시 조회해 이미 중단된 버튼을 숨긴다", async () => {
    const { repositories, approved } = await setup();
    const realSuspend = repositories.reviews.suspend;
    vi.spyOn(repositories.reviews, "suspend").mockImplementation(async (input) => {
      await realSuspend(input);
      throw new ApiError({ kind: "http", status: 409, code: "CONFLICT", message: "이미 중단됨" });
    });
    const detail = vi.spyOn(repositories.submissions, "getById");
    renderRoute(`/mine/${approved.id}`, { role: "SUBMITTER", repositories });
    const { user, input, confirm } = await openDialog();
    fireEvent.change(input, { target: { value: "취소" } });
    await user.click(confirm);
    await waitFor(() => expect(screen.queryByRole("button", { name: "게시 중단하기" })).toBeNull());
    expect(detail.mock.calls.length).toBeGreaterThan(1);
  });

  it.each([403, 404])("%i 오류를 안내하고 성공으로 처리하지 않는다", async (status) => {
    const { repositories, approved } = await setup();
    vi.spyOn(repositories.reviews, "suspend").mockRejectedValue(new ApiError({ kind: "http", status, code: status === 403 ? "FORBIDDEN" : "NOT_FOUND", message: "거절" }));
    renderRoute(`/mine/${approved.id}`, { role: "SUBMITTER", repositories });
    const { user, input, confirm } = await openDialog();
    fireEvent.change(input, { target: { value: "취소" } });
    await user.click(confirm);
    expect(await screen.findByText(status === 403 ? "이 작업을 수행할 권한이 없습니다." : "요청한 내용을 찾을 수 없습니다.")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect((await repositories.submissions.getById(approved.id)).status).toBe("PUBLISHED");
  });
});
