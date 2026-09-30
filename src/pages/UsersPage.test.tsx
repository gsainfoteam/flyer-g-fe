import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { createMemoryHeartbeatLog } from "@/mocks/heartbeats";
import { createMockRepositories } from "@/mocks/repositories";
import { MOCK_USERS } from "@/mocks/users";
import { ApiError } from "@/shared/api/error";
import { createFixedClock } from "@/shared/lib/clock";
import { TEST_NOW, renderRoute } from "@/test/render-route";

/**
 * 사용자 권한 (gsainfoteam/flyer-g-be#17). 시스템 운영자만 본다.
 *
 * mock 사용자(`MOCK_ACCOUNTS`) 기준: 운영자는 김도윤(본인)·최인준, 하우스 관리자는
 * 이수현·오세린·문태오다. 최인준은 두 역할을 다 가졌다. 김지스트는 동명이인이 둘이다.
 */
function operatorRepositories() {
  return createMockRepositories({
    clock: createFixedClock(TEST_NOW),
    session: () => MOCK_USERS.SUPER_ADMIN,
    heartbeats: createMemoryHeartbeatLog(),
  });
}

const section = (name: RegExp) =>
  screen.getByRole("heading", { name }).closest("section")!;

const namesIn = (element: HTMLElement) =>
  within(element)
    .getAllByRole("combobox")
    .map((box) => box.getAttribute("aria-label")!.replace(/ 역할$/, ""));

async function chooseRole(name: string, role: string, index = 0) {
  const user = userEvent.setup();
  const boxes = await screen.findAllByRole("combobox", {
    name: `${name} 역할`,
  });
  await user.click(boxes[index]!);
  await user.click(await screen.findByRole("option", { name: role }));
  return user;
}

describe("사용자 권한", () => {
  it("시스템 운영자에게만 메뉴가 보인다", async () => {
    renderRoute("/", { role: "SUPER_ADMIN" });
    expect(await screen.findByRole("link", { name: "권한" })).toHaveAttribute(
      "href",
      "/users",
    );
  });

  it("하우스 관리자에게는 메뉴가 없고 주소로 와도 권한 안내를 본다", async () => {
    renderRoute("/users", { role: "REVIEWER" });
    expect(
      await screen.findByRole("heading", {
        name: "이 화면을 볼 권한이 없어요",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "권한" })).toBeNull();
  });

  it("검색어가 없으면 권한을 가진 사람을 역할별로 보여 준다", async () => {
    renderRoute("/users", { role: "SUPER_ADMIN" });

    await screen.findByRole("heading", { name: "시스템 운영자 2명" });
    expect(namesIn(section(/^시스템 운영자/))).toEqual(["김도윤", "최인준"]);
    // 두 역할을 다 가진 최인준은 운영자 칸에만 있다.
    expect(
      await screen.findByRole("heading", { name: "하우스 관리자 3명" }),
    ).toBeInTheDocument();
    expect(namesIn(section(/^하우스 관리자/))).toEqual([
      "문태오",
      "오세린",
      "이수현",
    ]);
  });

  it("본인 역할은 바꿀 수 없다", async () => {
    renderRoute("/users", { role: "SUPER_ADMIN" });

    const own = await screen.findByRole("combobox", { name: "김도윤 역할" });
    expect(own).toBeDisabled();
    expect(
      screen.getByText("본인 역할은 다른 운영자가 바꿔야 해요"),
    ).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "최인준 역할" })).toBeEnabled();
  });

  it("검색하면 전체 사용자에서 찾고 동명이인을 이메일·학번으로 구분한다", async () => {
    const user = userEvent.setup();
    renderRoute("/users", { role: "SUPER_ADMIN" });
    await screen.findByRole("heading", { name: "시스템 운영자 2명" });

    await user.type(
      screen.getByRole("searchbox", { name: "사용자 검색" }),
      "김지스트",
    );

    expect(
      await screen.findByRole("heading", { name: "검색 결과 2명" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("gist.kim@gm.gist.ac.kr · 20245001"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("jiseu.kim@gm.gist.ac.kr · 20211093"),
    ).toBeInTheDocument();
  });

  it("찾는 사람이 없으면 로그인한 사람만 찾을 수 있다고 알려 준다", async () => {
    const user = userEvent.setup();
    renderRoute("/users", { role: "SUPER_ADMIN" });

    await user.type(
      await screen.findByRole("searchbox", { name: "사용자 검색" }),
      "없는사람",
    );

    expect(await screen.findByText("찾는 사용자가 없어요")).toBeInTheDocument();
    expect(
      screen.getByText(/한 번이라도 로그인한 사용자만 찾을 수 있어요/),
    ).toBeInTheDocument();
  });

  it("시스템 운영자로 바꾸기 전에 한 번 묻는다", async () => {
    renderRoute("/users", {
      role: "SUPER_ADMIN",
      repositories: operatorRepositories(),
    });

    const user = await chooseRole("문태오", "시스템 운영자");
    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByText("문태오님을 시스템 운영자로 바꿀까요?"),
    ).toBeInTheDocument();
    await user.click(
      within(dialog).getByRole("button", { name: "시스템 운영자로 바꾸기" }),
    );

    expect(
      await screen.findByText("문태오님을 시스템 운영자로 바꿨어요"),
    ).toBeInTheDocument();
    await screen.findByRole("heading", { name: "시스템 운영자 3명" });
    expect(namesIn(section(/^시스템 운영자/))).toContain("문태오");
  });

  it("취소하면 역할을 바꾸지 않는다", async () => {
    const repositories = operatorRepositories();
    renderRoute("/users", { role: "SUPER_ADMIN", repositories });

    const user = await chooseRole("문태오", "시스템 운영자");
    await user.click(await screen.findByRole("button", { name: "취소" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    const operators = await repositories.users.list({ role: "SUPER_ADMIN" });
    expect(operators.totalCount).toBe(2);
  });

  it("운영자를 하우스 관리자로 내리면 하우스 관리자 칸으로 옮겨 간다", async () => {
    const repositories = operatorRepositories();
    renderRoute("/users", { role: "SUPER_ADMIN", repositories });

    await chooseRole("최인준", "하우스 관리자");

    expect(
      await screen.findByText("최인준님을 하우스 관리자로 바꿨어요"),
    ).toBeInTheDocument();
    await screen.findByRole("heading", { name: "시스템 운영자 1명" });
    expect(namesIn(section(/^하우스 관리자/))).toContain("최인준");
    const [moved] = (await repositories.users.list({ q: "injun" })).items;
    expect(moved!.grantedRoles).toEqual(["REVIEWER"]);
  });

  it("게시자로 내리면 권한자 목록에서 빠진다", async () => {
    renderRoute("/users", {
      role: "SUPER_ADMIN",
      repositories: operatorRepositories(),
    });

    await chooseRole("오세린", "게시자");

    await screen.findByRole("heading", { name: "하우스 관리자 2명" });
    expect(namesIn(section(/^하우스 관리자/))).not.toContain("오세린");
  });

  it("바꾸지 못하면 이유를 알리고 원래 역할로 돌아간다", async () => {
    const repositories = operatorRepositories();
    repositories.users.revokeRole = async () => {
      throw new ApiError({
        kind: "http",
        code: "CONFLICT",
        message: "Cannot revoke the last super admin",
        status: 409,
      });
    };
    renderRoute("/users", { role: "SUPER_ADMIN", repositories });

    await chooseRole("오세린", "게시자");

    expect(
      await screen.findByText("역할을 바꾸지 못했어요"),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.getByRole("combobox", { name: "오세린 역할" }),
      ).toHaveTextContent("하우스 관리자"),
    );
  });
});
