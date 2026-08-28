import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { toIsoUtc } from "@/shared/lib/datetime";
import type { Playlist } from "@/entities/playlist/model/types";
import { toPlaylist } from "@/entities/playlist";
import { createMockRepositories } from "@/mocks/repositories";
import type { Repositories } from "@/shared/api/repositories";
import { createFixedClock } from "@/shared/lib/clock";
import { TEST_NOW, renderRoute } from "@/test/render-route";

/**
 * TV 플레이어 (명세 FR-PLY-01 ~ FR-PLY-06).
 * 실제 route로 띄운다. 기기 인증 없이 접근 가능해야 한다.
 */
function playlistWith(items: {
  id: string;
  title: string;
  layout?: "SINGLE" | "FOUR_GRID";
}[]): Playlist {
  const layout = items[0]?.layout ?? "SINGLE";
  return toPlaylist({
    serverTime: toIsoUtc(TEST_NOW),
    playlistVersion: "test:1",
    refreshAfterSeconds: 60,
    layout: { type: layout, rotationSeconds: 10 },
    items: items.map(({ id, title }) => ({
      submissionId: id,
      revision: 1,
      title,
      category: "공지",
      assetUrl: `/posters/${id}.webp`,
      detailUrl: `https://ziggle.gistory.me/notice/${id}`,
      startsAt: toIsoUtc(new Date(TEST_NOW.getTime() - 1000 * 60 * 60)),
      endsAt: toIsoUtc(new Date(TEST_NOW.getTime() + 1000 * 60 * 60 * 24)),
      priority: 0,
      checksum: `sha:${id}`,
      subtitle: null,
      location: null,
      organizerName: "가상 조직",
    })),
  });
}

function withPlaylist(playlist: Playlist): Repositories {
  const repositories = createMockRepositories({
    clock: createFixedClock(TEST_NOW),
  });
  vi.spyOn(repositories.displays, "getPlaylist").mockResolvedValue(playlist);
  return repositories;
}

describe("TV 플레이어", () => {
  it("로그인 없이 서버 편성을 재생한다", async () => {
    const repositories = withPlaylist(
      playlistWith([{ id: "p1", title: "첫 포스터" }]),
    );
    renderRoute("/display/device-preview", { repositories });

    expect(
      await screen.findByRole("heading", { name: "첫 포스터" }),
    ).toBeInTheDocument();
  });

  it("운영 모드에는 조작 컨트롤이 없다", async () => {
    const repositories = withPlaylist(
      playlistWith([
        { id: "p1", title: "첫 포스터" },
        { id: "p2", title: "둘째 포스터" },
      ]),
    );
    renderRoute("/display/device-preview", { repositories });

    await screen.findByRole("heading", { name: "첫 포스터" });
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByText("미리보기")).toBeNull();
  });

  it("preview 모드에서만 일시정지·다음 컨트롤이 보인다", async () => {
    const repositories = withPlaylist(
      playlistWith([
        { id: "p1", title: "첫 포스터" },
        { id: "p2", title: "둘째 포스터" },
      ]),
    );
    renderRoute("/display/device-preview?preview=1", { repositories });

    await screen.findByRole("heading", { name: "첫 포스터" });
    expect(screen.getByText("미리보기")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "일시정지" }),
    ).toBeInTheDocument();

    // 다음 버튼으로 수동 순환한다.
    fireEvent.click(screen.getByRole("button", { name: "다음 페이지" }));
    expect(
      await screen.findByRole("heading", { name: "둘째 포스터" }),
    ).toBeInTheDocument();
  });

  it("이미지가 깨진 항목을 건너뛰고 재생을 계속한다", async () => {
    const repositories = withPlaylist(
      playlistWith([
        { id: "broken", title: "깨진 포스터" },
        { id: "ok", title: "정상 포스터" },
      ]),
    );
    renderRoute("/display/device-preview", { repositories });

    const image = await screen.findByAltText("깨진 포스터 포스터");
    fireEvent.error(image);

    // 깨진 항목이 목록에서 빠지고 다음 항목이 나온다.
    expect(
      await screen.findByRole("heading", { name: "정상 포스터" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "깨진 포스터" }),
    ).toBeNull();
  });

  it("만료된 항목은 서버가 보냈어도 방어적으로 거른다", async () => {
    const playlist = playlistWith([{ id: "p1", title: "살아있는 포스터" }]);
    const expired = toPlaylist({
      serverTime: toIsoUtc(TEST_NOW),
      playlistVersion: "test:2",
      refreshAfterSeconds: 60,
      layout: { type: "SINGLE", rotationSeconds: 10 },
      items: [
        {
          submissionId: "dead",
          revision: 1,
          title: "만료된 포스터",
          category: "공지",
          assetUrl: "/posters/dead.webp",
          detailUrl: "https://ziggle.gistory.me/notice/dead",
          startsAt: toIsoUtc(new Date(TEST_NOW.getTime() - 1000 * 60 * 120)),
          endsAt: toIsoUtc(new Date(TEST_NOW.getTime() - 1000 * 60 * 60)),
          priority: 0,
          checksum: "sha:dead",
        },
        ...playlist.items.map((item) => ({
          ...item,
          startsAt: toIsoUtc(item.startsAt),
          endsAt: toIsoUtc(item.endsAt),
        })),
      ],
    });
    const repositories = withPlaylist(expired);
    renderRoute("/display/device-preview", { repositories });

    expect(
      await screen.findByRole("heading", { name: "살아있는 포스터" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "만료된 포스터" }),
    ).toBeNull();
  });

  it("유효 콘텐츠가 없으면 브랜드와 안내를 보여준다", async () => {
    const repositories = withPlaylist(playlistWith([]));
    renderRoute("/display/device-preview", { repositories });

    expect(
      await screen.findByRole("heading", { name: /지금 게시 중인/ }),
    ).toBeInTheDocument();
    expect(screen.getByText(/ziggle\.gistory\.me/)).toBeInTheDocument();
  });
});
