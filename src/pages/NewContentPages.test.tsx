import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { createMockRepositories } from "@/mocks/repositories";
import { createFixedClock } from "@/shared/lib/clock";
import { TEST_NOW, renderRoute } from "@/test/render-route";

/** 이벤트 배너·소식 제보 쓰기 (기획 2-1, 배포 ③④) */
function repositories() {
  return createMockRepositories({ clock: createFixedClock(TEST_NOW) });
}

describe("소식 제보 쓰기", () => {
  it("말머리와 10자 이상 본문이 있어야 보내고, 보내면 상세로 간다", async () => {
    const user = userEvent.setup();
    const repos = repositories();
    const { router } = renderRoute("/new/story", {
      role: "SUBMITTER",
      repositories: repos,
    });

    await user.click(await screen.findByRole("button", { name: "심사 요청" }));
    expect(screen.getByText("말머리를 고르세요.")).toBeInTheDocument();
    expect(screen.getByText(/본문은 10자 이상/)).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: "칭찬" }));
    await user.type(
      screen.getByRole("textbox", { name: /본문/ }),
      "세탁실 건조기가 고쳐졌어요. 고맙습니다!",
    );
    // 미리보기 카드에 바로 보인다.
    expect(
      within(screen.getByRole("img", { name: "TV 화면 미리보기" })).getByText(
        "세탁실 건조기가 고쳐졌어요. 고맙습니다!",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("오늘 남은 제보 5건")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "심사 요청" }));

    await waitFor(() =>
      expect(router.state.location.pathname).toMatch(/^\/mine\//),
    );
    const id = router.state.location.pathname.split("/").at(-1)!;
    await expect(repos.submissions.getById(id)).resolves.toMatchObject({
      type: "STORY",
      status: "PENDING_REVIEW",
      story: { tag: "PRAISE", body: "세탁실 건조기가 고쳐졌어요. 고맙습니다!" },
    });
    // 상세는 제보 내용과 승인 뒤 기간을 보여 준다.
    expect((await screen.findAllByText(/승인 후 2일/)).length).toBeGreaterThan(
      0,
    );
    expect(screen.getByText("본문").nextElementSibling).toHaveTextContent(
      "세탁실 건조기가 고쳐졌어요. 고맙습니다!",
    );
  });
});

describe("이벤트 배너 만들기", () => {
  it("문구로 만들기는 종류·받는 사람·문구가 있어야 하고, 미리보기에 바로 보인다", async () => {
    const user = userEvent.setup();
    const repos = repositories();
    const { router } = renderRoute("/new/event", {
      role: "SUBMITTER",
      repositories: repos,
    });

    await user.click(await screen.findByRole("button", { name: "심사 요청" }));
    expect(screen.getByText("어떤 소식인지 고르세요.")).toBeInTheDocument();
    expect(screen.getByText("받는 사람을 입력하세요.")).toBeInTheDocument();
    expect(screen.getByText("전할 말을 입력하세요.")).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: "생일" }));
    await user.type(screen.getByRole("textbox", { name: /받는 사람/ }), "지민");
    await user.type(
      screen.getByRole("textbox", { name: /문구/ }),
      "생일 축하해!",
    );
    const preview = within(
      screen.getByRole("img", { name: "TV 화면 미리보기" }),
    );
    expect(preview.getByText("지민, 생일 축하해")).toBeInTheDocument();
    expect(preview.getByText("생일 축하해!")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "심사 요청" }));

    await waitFor(() =>
      expect(router.state.location.pathname).toMatch(/^\/mine\//),
    );
    const id = router.state.location.pathname.split("/").at(-1)!;
    await expect(repos.submissions.getById(id)).resolves.toMatchObject({
      type: "EVENT_BANNER",
      title: "생일 · 지민에게",
      eventBanner: { mode: "TEMPLATE", recipient: "지민" },
    });
  });

  it("이미지 올리기는 배너 이미지가 있어야 한다", async () => {
    const user = userEvent.setup();
    renderRoute("/new/event", { role: "SUBMITTER" });

    await user.click(await screen.findByRole("tab", { name: "이미지 올리기" }));
    await user.type(screen.getByRole("textbox", { name: /받는 사람/ }), "지민");
    await user.click(screen.getByRole("button", { name: "심사 요청" }));

    expect(screen.getByText("배너 이미지를 올려주세요.")).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: /문구/ })).toBeNull();
  });
});
