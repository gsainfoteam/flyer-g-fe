import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { createMockRepositories } from "@/mocks/repositories";
import { MOCK_USERS } from "@/mocks/users";
import { createFixedClock } from "@/shared/lib/clock";
import { TEST_NOW, renderRoute } from "@/test/render-route";
import { createLineupPlayer } from "@/entities/lineup/model/playback";

const setup = async () => {
  const repos = createMockRepositories({
    clock: createFixedClock(TEST_NOW),
    session: () => MOCK_USERS.SUPER_ADMIN,
  });
  const user = userEvent.setup();
  renderRoute("/tv", { role: "SUPER_ADMIN", repositories: repos });
  await screen.findByRole("heading", { name: /디스플레이 기기/ });
  await user.click(
    (await screen.findAllByRole("button", { name: "편성" }))[0]!,
  );
  const dialog = await screen.findByRole("dialog");
  await within(dialog).findByRole("button", { name: "편성 저장" });
  return { repos, user, dialog };
};

describe("TV 편성 관리", () => {
  it("이벤트·제보 블록을 추가하고 순서·시간을 저장하면 같은 그룹 TV 재생에 반영된다", async () => {
    const { repos, user, dialog } = await setup();
    const form = within(dialog);
    const devices = await repos.devices.list();
    const device = devices.items[0]!;
    await user.selectOptions(
      form.getByRole("combobox", { name: "추가할 콘텐츠" }),
      "EVENT_BANNER",
    );
    await user.click(form.getByRole("button", { name: "추가" }));
    await user.selectOptions(
      form.getByRole("combobox", { name: "추가할 콘텐츠" }),
      "STORY",
    );
    await user.click(form.getByRole("button", { name: "추가" }));
    await user.click(form.getByRole("button", { name: "3번 소식 제보 위로" }));
    const times = form.getAllByRole("spinbutton", {
      name: "블록 표시 시간(초)",
    });
    await user.clear(times[1]!);
    await user.type(times[1]!, "30");
    await user.click(form.getByRole("button", { name: "편성 저장" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    const saved = await repos.lineups.get(device.programGroupId!);
    expect(saved.blocks.map((b) => b.submissionType)).toEqual([
      "POSTER",
      "STORY",
      "EVENT_BANNER",
    ]);
    expect(saved.blocks[1]?.durationSeconds).toBe(30);
    const playlist = await repos.displays.getPlaylist(device.id);
    expect(playlist.lineup?.blocks).toEqual(saved.blocks);
    // Empty source blocks do not create blank frames, even in a saved lineup.
    const frame = createLineupPlayer().tick(
      {
        lineup: playlist.lineup!,
        posters: [],
        content: { eventBanners: [], stories: [] },
        widgetRatio: 0,
        canHostGame: false,
      },
      TEST_NOW,
      0,
    );
    expect(frame.currentFrame).toBeUndefined();
  });
  it("동시 수정 409에서 입력을 유지하고 최신 편성을 다시 받기 전까지 저장을 막는다", async () => {
    const { repos, user, dialog } = await setup();
    const device = (await repos.devices.list()).items[0]!;
    const current = await repos.lineups.get(device.programGroupId!);
    await repos.lineups.save(current.groupId, { ...current, blocks: [] });
    await user.click(within(dialog).getByRole("button", { name: "편성 저장" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "다른 운영자가",
    );
    expect(
      within(dialog).getByRole("button", { name: "편성 저장" }),
    ).toBeDisabled();
    expect(
      within(dialog).getByRole("heading", { name: "포스터" }),
    ).toBeInTheDocument();
    await user.click(
      within(dialog).getByRole("button", {
        name: "현재 입력을 버리고 최신 편성 불러오기",
      }),
    );
    expect(
      await within(dialog).findByText(/편성이 비어 있습니다/),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: "편성 저장" }),
    ).toBeEnabled();
  });
});
