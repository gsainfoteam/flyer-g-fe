import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { createMemoryHeartbeatLog } from "@/mocks/heartbeats";
import { createMockRepositories } from "@/mocks/repositories";
import { MOCK_USERS } from "@/mocks/users";
import { createFixedClock } from "@/shared/lib/clock";
import { TEST_NOW, renderRoute } from "@/test/render-route";

/** 기기 관리 (`API-CHANGES-BACKEND.md` 11.1). 시스템 운영자만 본다. */
describe("기기 관리", () => {
  it("시스템 운영자에게만 메뉴가 보인다", async () => {
    renderRoute("/", { role: "SUPER_ADMIN" });
    expect(await screen.findByRole("link", { name: "TV" })).toHaveAttribute(
      "href",
      "/tv",
    );
  });

  it("하우스 관리자에게는 메뉴가 없고 주소로 와도 권한 안내를 본다", async () => {
    renderRoute("/tv", { role: "REVIEWER" });
    expect(
      await screen.findByRole("heading", {
        name: "접근 권한 없음",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "TV" })).toBeNull();
  });

  it("등록된 기기와 연결 상태, 화면 설정을 보여준다", async () => {
    renderRoute("/tv", { role: "SUPER_ADMIN" });

    expect(
      await screen.findByRole("heading", { name: "디스플레이 기기 2대" }),
    ).toBeInTheDocument();
    const rows = screen
      .getAllByRole("listitem")
      .filter((row) =>
        within(row).queryByRole("button", { name: "토큰 재발급" }),
      );
    expect(rows).toHaveLength(2);
    expect(within(rows[0]!).getByText("A동 로비")).toBeInTheDocument();
    expect(
      within(rows[0]!).getByText(/모아 보기 · 포스터 10초마다 넘김/),
    ).toBeInTheDocument();
  });

  it("기기를 등록하면 TV 설정 링크를 한 번 보여준다", async () => {
    const user = userEvent.setup();
    renderRoute("/tv", { role: "SUPER_ADMIN" });
    await screen.findByRole("heading", { name: /디스플레이 기기/ });

    await user.click(screen.getByRole("button", { name: "기기 등록" }));
    const form = await screen.findByRole("dialog");
    // 이름 없이 누르면 닫지 않고 알려 준다.
    await user.click(within(form).getByRole("button", { name: "등록" }));
    expect(
      await within(form).findByText("기기 이름을 입력하세요."),
    ).toBeInTheDocument();

    await user.type(
      within(form).getByRole("textbox", { name: /기기 이름/ }),
      "C동 로비",
    );
    await user.click(
      within(form).getByRole("checkbox", { name: "학사기숙사 A동" }),
    );
    await user.click(within(form).getByRole("button", { name: "등록" }));

    const setup = await screen.findByRole("dialog", {
      name: "C동 로비 기기 등록 완료",
    });
    const link = within(setup).getByRole("textbox", { name: "TV 설정 링크" });
    expect((link as HTMLInputElement).value).toMatch(
      /\/display\/device-[^#]+#token=fgd_mock_/,
    );

    await user.click(within(setup).getByRole("button", { name: "완료" }));
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "디스플레이 기기 3대" }),
      ).toBeInTheDocument(),
    );
  });

  it("토큰을 재발급하면 새 설정 링크를 보여준다", async () => {
    const user = userEvent.setup();
    renderRoute("/tv", { role: "SUPER_ADMIN" });
    await screen.findByRole("heading", { name: /디스플레이 기기/ });

    await user.click(
      screen.getAllByRole("button", { name: "토큰 재발급" })[0]!,
    );
    const confirm = await screen.findByRole("dialog");
    expect(
      within(confirm).getByText(/현재 TV 연결이 즉시 해제됩니다/),
    ).toBeInTheDocument();
    await user.click(within(confirm).getByRole("button", { name: "재발급" }));

    expect(
      await screen.findByRole("dialog", {
        name: "A동 로비 토큰 재발급 완료",
      }),
    ).toBeInTheDocument();
  });

  it("화면 끔 시간의 TV는 오프라인이 아니라 화면 끔으로 표시한다", async () => {
    const repositories = createMockRepositories({
      clock: createFixedClock(TEST_NOW),
      session: () => MOCK_USERS.SUPER_ADMIN,
      heartbeats: createMemoryHeartbeatLog(),
    });
    // TEST_NOW는 서울 12:00이다. B동은 끊긴 기기다.
    await repositories.devices.update("house-b-lobby", {
      overrides: {
        settings: { quietHours: [{ start: "11:00", end: "13:00" }] },
      },
    });
    renderRoute("/tv", { role: "SUPER_ADMIN", repositories });

    expect(await screen.findByText("화면 끔")).toBeInTheDocument();
    expect(screen.queryByText("오프라인")).toBeNull();
  });

  it("등록 폼은 위치 그룹을 받고, 화면 설정은 그룹 편성을 따른다", async () => {
    const user = userEvent.setup();
    renderRoute("/tv", { role: "SUPER_ADMIN" });
    await screen.findByRole("heading", { name: /디스플레이 기기/ });

    await user.click(screen.getByRole("button", { name: "기기 등록" }));
    const form = await screen.findByRole("dialog");

    expect(within(form).queryByText("화면 전환")).toBeNull();
    await user.type(
      within(form).getByRole("textbox", { name: /기기 이름/ }),
      "C동 로비",
    );
    await user.click(within(form).getByRole("button", { name: "등록" }));
    expect(
      await within(form).findByText("위치 그룹을 하나 이상 선택하세요."),
    ).toBeInTheDocument();
  });

  it("고른 그룹이 저장 전에 지워지면 표시해 두고, 선택을 풀면 저장된다", async () => {
    const user = userEvent.setup();
    const repositories = createMockRepositories({
      clock: createFixedClock(TEST_NOW),
      session: () => MOCK_USERS.SUPER_ADMIN,
      heartbeats: createMemoryHeartbeatLog(),
    });
    const created = await repositories.reference.createTargetGroup({
      name: "학사기숙사 C동",
    });
    renderRoute("/tv", { role: "SUPER_ADMIN", repositories });
    await screen.findByRole("heading", { name: /디스플레이 기기/ });

    await user.click(screen.getByRole("button", { name: "기기 등록" }));
    const form = await screen.findByRole("dialog");
    await user.type(
      within(form).getByRole("textbox", { name: /기기 이름/ }),
      "C동 로비",
    );
    await user.click(
      within(form).getByRole("checkbox", { name: "학사기숙사 C동" }),
    );

    // 다른 운영자가 그 사이에 그룹을 지웠다.
    await repositories.reference.deleteTargetGroup(created.id);
    await user.click(within(form).getByRole("button", { name: "등록" }));

    const gone = await within(form).findByRole("checkbox", {
      name: "삭제된 그룹",
    });
    expect(gone).toBeChecked();
    expect(
      within(form).getByText(/해당 그룹의 선택을 해제하세요/),
    ).toBeInTheDocument();

    await user.click(gone);
    expect(
      within(form).queryByRole("checkbox", { name: "삭제된 그룹" }),
    ).toBeNull();
    await user.click(
      within(form).getByRole("checkbox", { name: "학사기숙사 A동" }),
    );
    await user.click(within(form).getByRole("button", { name: "등록" }));
    expect(
      await screen.findByRole("dialog", { name: "C동 로비 기기 등록 완료" }),
    ).toBeInTheDocument();
  });
});
