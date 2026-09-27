import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { renderRoute } from "@/test/render-route";

/** 기기 관리 (`API-CHANGES-BACKEND.md` 11.1). 시스템 운영자만 본다. */
describe("기기 관리", () => {
  it("시스템 운영자에게만 메뉴가 보인다", async () => {
    renderRoute("/", { role: "SUPER_ADMIN" });
    expect(await screen.findByRole("link", { name: "기기" })).toHaveAttribute(
      "href",
      "/displays",
    );
  });

  it("하우스 관리자에게는 메뉴가 없고 주소로 와도 권한 안내를 본다", async () => {
    renderRoute("/displays", { role: "REVIEWER" });
    expect(
      await screen.findByRole("heading", {
        name: "이 화면을 볼 권한이 없어요",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "기기" })).toBeNull();
  });

  it("등록된 기기와 연결 상태, 화면 설정을 보여준다", async () => {
    renderRoute("/displays", { role: "SUPER_ADMIN" });

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
      within(rows[0]!).getByText(/한 장씩 · 10초마다 넘김/),
    ).toBeInTheDocument();
  });

  it("기기를 등록하면 TV 설정 링크를 한 번 보여준다", async () => {
    const user = userEvent.setup();
    renderRoute("/displays", { role: "SUPER_ADMIN" });
    await screen.findByRole("heading", { name: /디스플레이 기기/ });

    await user.click(screen.getByRole("button", { name: "기기 등록" }));
    const form = await screen.findByRole("dialog");
    // 이름 없이 누르면 닫지 않고 알려 준다.
    await user.click(within(form).getByRole("button", { name: "등록" }));
    expect(
      await within(form).findByText("기기 이름을 입력해 주세요."),
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
      name: "C동 로비 기기를 등록했어요",
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
    renderRoute("/displays", { role: "SUPER_ADMIN" });
    await screen.findByRole("heading", { name: /디스플레이 기기/ });

    await user.click(
      screen.getAllByRole("button", { name: "토큰 재발급" })[0]!,
    );
    const confirm = await screen.findByRole("dialog");
    expect(
      within(confirm).getByText(/지금 연결된 TV는 바로 끊겨요/),
    ).toBeInTheDocument();
    await user.click(within(confirm).getByRole("button", { name: "재발급" }));

    expect(
      await screen.findByRole("dialog", {
        name: "A동 로비 토큰을 재발급했어요",
      }),
    ).toBeInTheDocument();
  });
});
