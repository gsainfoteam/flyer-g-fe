import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { toIsoUtc } from "@/shared/lib/datetime";
import type { LayoutType, Playlist } from "@/entities/playlist/model/types";
import { toPlaylist } from "@/entities/playlist";
import { NO_WIDGETS, WIDGETS_UNSUPPORTED } from "@/entities/widget/model/feed";
import { createMockRepositories } from "@/mocks/repositories";
import type { Repositories } from "@/shared/api/repositories";
import { createFixedClock } from "@/shared/lib/clock";
import { ApiError } from "@/shared/api/error";
import { deviceCredentials } from "@/shared/lib/device-credential";
import { TEST_NOW, renderRoute } from "@/test/render-route";

/**
 * TV 플레이어 (명세 FR-PLY-01 ~ FR-PLY-06).
 * 실제 route로 띄운다. 기기 인증 없이 접근 가능해야 한다.
 */
function playlistWith(
  items: {
    id: string;
    title: string;
    layout?: LayoutType;
  }[],
): Playlist {
  // 한 건씩 가운데에 오는 흐르는 띠로 돌려 제목(heading)을 하나씩 확인한다.
  const layout = items[0]?.layout ?? "STRIP";
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
      kind: "IMAGE",
      width: 1080,
      height: 1440,
      durationMs: null,
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
  // 포스터 순환만 본다. 위젯은 포스터가 적으면 사이를 채우므로 따로 확인한다.
  vi.spyOn(repositories.widgets, "getDeviceWidgets").mockResolvedValue(NO_WIDGETS);
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

  it("운영 화면에서 Enter와 오른쪽 화살표로 한 장씩 넘긴다", async () => {
    const repositories = withPlaylist(playlistWith([
      { id: "p1", title: "첫 포스터" },
      { id: "p2", title: "둘째 포스터" },
      { id: "p3", title: "셋째 포스터" },
    ]));
    renderRoute("/display/device-preview", { repositories });
    await screen.findByRole("heading", { name: "첫 포스터" });
    fireEvent.keyDown(window, { key: "Enter" });
    expect(screen.getByRole("progressbar", { name: "이전으로 돌아가기" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "첫 포스터" })).toBeInTheDocument();
    fireEvent.keyUp(window, { key: "Enter" });
    await screen.findByRole("heading", { name: "둘째 포스터" });
    expect(screen.getByText("잠시 후 자동 재생")).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Enter", repeat: true });
    expect(screen.getByRole("heading", { name: "둘째 포스터" })).toBeInTheDocument();
    fireEvent.keyUp(window, { key: "Enter" });
    fireEvent.keyDown(window, { key: "ArrowRight" });
    await screen.findByRole("heading", { name: "셋째 포스터" });
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
    fireEvent.click(screen.getByRole("button", { name: "다음 화면" }));
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

    // 띠는 양옆에도 같은 이미지를 그린다. 어느 칸에서 실패해도 항목을 뺀다.
    const [image] = await screen.findAllByAltText("깨진 포스터 포스터");
    fireEvent.error(image!);

    // 깨진 항목이 목록에서 빠지고 다음 항목이 나온다.
    expect(
      await screen.findByRole("heading", { name: "정상 포스터" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "깨진 포스터" })).toBeNull();
  });

  it("이미지 실패로 뺀 항목은 편성이 바뀌면 다시 시도한다", async () => {
    const first = playlistWith([
      { id: "flaky", title: "잠깐 실패한 포스터" },
      { id: "ok", title: "정상 포스터" },
    ]);
    const next = { ...first, playlistVersion: "test:2" };
    const repositories = createMockRepositories({
      clock: createFixedClock(TEST_NOW),
    });
    vi.spyOn(repositories.displays, "getPlaylist")
      .mockResolvedValueOnce(first)
      .mockResolvedValue(next);
    renderRoute("/display/device-preview?preview=1", { repositories });

    const [flaky] = await screen.findAllByAltText("잠깐 실패한 포스터 포스터");
    fireEvent.error(flaky!);
    await screen.findByRole("heading", { name: "정상 포스터" });
    // 미리보기 컨트롤과 띠의 머리 줄이 같은 순서를 센다.
    expect(screen.getAllByText("1 / 1")).not.toHaveLength(0);

    // 화면이 다시 보이면 편성을 새로 받는다. 버전이 바뀌었으니 다시 시도한다.
    fireEvent(window, new Event("visibilitychange"));

    expect(await screen.findAllByText(/\/ 2$/)).not.toHaveLength(0);
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
    expect(screen.queryByRole("heading", { name: "만료된 포스터" })).toBeNull();
  });

  it("서버에 위젯 API가 없어도 포스터가 적으면 기본 위젯으로 채운다", async () => {
    const repositories = withPlaylist(
      playlistWith([{ id: "p1", title: "첫 포스터" }]),
    );
    vi.spyOn(repositories.widgets, "getDeviceWidgets").mockResolvedValue(
      WIDGETS_UNSUPPORTED,
    );
    renderRoute("/display/device-preview?preview=1", { repositories });

    await screen.findByRole("heading", { name: "첫 포스터" });
    fireEvent.click(screen.getByRole("button", { name: "다음 화면" }));
    expect(await screen.findByText(/띠별 운세/)).toBeInTheDocument();
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

describe("기기 연결 (`API-CHANGES-BACKEND.md` 8절)", () => {
  it("토큰이 없거나 거절되면 설정 링크로 다시 열라고 안내한다", async () => {
    const repositories = createMockRepositories({
      clock: createFixedClock(TEST_NOW),
    });
    vi.spyOn(repositories.displays, "getPlaylist").mockRejectedValue(
      new ApiError({
        kind: "http",
        code: "DEVICE_UNAUTHORIZED",
        message: "denied",
        status: 401,
      }),
    );
    renderRoute("/display/dev_01", { repositories });

    expect(
      await screen.findByRole("heading", { name: "TV 연결 해제" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/새 설정 링크를 받으세요/)).toBeInTheDocument();
    expect(screen.getByText("기기 ID · dev_01")).toBeInTheDocument();
  });

  it("재생 중에 토큰이 거절되면 받아 둔 편성이 있어도 멈추고 안내한다", async () => {
    const repositories = createMockRepositories({
      clock: createFixedClock(TEST_NOW),
    });
    vi.spyOn(repositories.displays, "getPlaylist")
      .mockResolvedValueOnce(playlistWith([{ id: "p1", title: "첫 포스터" }]))
      .mockRejectedValue(
        new ApiError({
          kind: "http",
          code: "DEVICE_UNAUTHORIZED",
          message: "revoked",
          status: 401,
        }),
      );
    renderRoute("/display/dev_01", { repositories });
    await screen.findByRole("heading", { name: "첫 포스터" });

    // 화면이 다시 보이면 편성을 새로 받는다. 이번엔 토큰이 거절된다.
    fireEvent(window, new Event("visibilitychange"));

    expect(
      await screen.findByRole("heading", { name: "TV 연결 해제" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "첫 포스터" })).toBeNull();
  });

  it("토큰이 거절된 뒤 네트워크가 끊겨도 받아 둔 편성을 다시 재생하지 않는다", async () => {
    const repositories = createMockRepositories({
      clock: createFixedClock(TEST_NOW),
    });
    const getPlaylist = vi
      .spyOn(repositories.displays, "getPlaylist")
      .mockResolvedValueOnce(playlistWith([{ id: "p1", title: "첫 포스터" }]))
      .mockRejectedValueOnce(
        new ApiError({
          kind: "http",
          code: "DEVICE_UNAUTHORIZED",
          message: "revoked",
          status: 401,
        }),
      )
      .mockRejectedValueOnce(
        new ApiError({
          kind: "network",
          code: "NETWORK_ERROR",
          message: "offline",
        }),
      )
      .mockResolvedValue(playlistWith([{ id: "p1", title: "첫 포스터" }]));
    renderRoute("/display/dev_01", { repositories });
    await screen.findByRole("heading", { name: "첫 포스터" });

    fireEvent(window, new Event("visibilitychange"));
    await screen.findByRole("heading", { name: "TV 연결 해제" });

    // 다음 조회는 연결 끊김. 거절은 풀리지 않는다.
    fireEvent(window, new Event("visibilitychange"));
    await vi.waitFor(() => expect(getPlaylist).toHaveBeenCalledTimes(3));
    expect(
      screen.getByRole("heading", { name: "TV 연결 해제" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "첫 포스터" })).toBeNull();

    // 새 설정 링크로 인증된 조회가 성공하면 다시 재생한다.
    fireEvent(window, new Event("visibilitychange"));
    expect(
      await screen.findByRole("heading", { name: "첫 포스터" }),
    ).toBeInTheDocument();
  });

  it("설정 링크로 열면 첫 편성 요청 전에 토큰을 저장하고 주소에서 지운다", async () => {
    window.history.replaceState(null, "", "/display/dev_01#token=fgd_secret");
    const repositories = withPlaylist(
      playlistWith([{ id: "p1", title: "첫 포스터" }]),
    );
    const getPlaylist = vi.mocked(repositories.displays.getPlaylist);
    getPlaylist.mockImplementation(async () => {
      // 첫 요청 시점에 이미 저장되어 있어야 한다.
      expect(deviceCredentials.get("dev_01")).toBe("fgd_secret");
      return playlistWith([{ id: "p1", title: "첫 포스터" }]);
    });

    try {
      renderRoute("/display/dev_01", { repositories });

      await screen.findByRole("heading", { name: "첫 포스터" });
      expect(window.location.hash).toBe("");
      expect(getPlaylist).toHaveBeenCalled();
    } finally {
      deviceCredentials.clear("dev_01");
      window.history.replaceState(null, "", "/");
    }
  });
});

describe("11/2–11/7 저녁 클릭 배틀 이벤트(시간대 점유)", () => {
  function eventRepositories(now: string) {
    const time = new Date(now);
    const repositories = createMockRepositories({ clock: createFixedClock(time) });
    const playlist = toPlaylist({
      serverTime: toIsoUtc(time),
      playlistVersion: "event-test",
      refreshAfterSeconds: 60,
      layout: { type: "STRIP", rotationSeconds: 10 },
      items: [{
        submissionId: "normal-poster", revision: 1, title: "평소 포스터",
        category: "공지", assetUrl: "/posters/vesper.webp", detailUrl: null,
        startsAt: "2026-11-01T00:00:00Z", endsAt: "2026-11-10T00:00:00Z",
        priority: 0, checksum: "normal-poster", kind: "IMAGE",
        width: 828, height: 1171, durationMs: null, subtitle: null,
        location: null, organizerName: null,
      }],
    });
    vi.spyOn(repositories.displays, "getPlaylist").mockResolvedValue(playlist);
    // 위젯이 모두 꺼져 있어도 시간대 점유는 동작한다.
    vi.spyOn(repositories.widgets, "getDeviceWidgets").mockResolvedValue(NO_WIDGETS);
    return repositories;
  }

  it("이벤트 시간에는 포스터·위젯 설정과 관계없이 게임을 띄우고 수동 넘김도 막는다", async () => {
    const repositories = eventRepositories("2026-11-02T21:00:00+09:00");
    renderRoute("/display/device-preview?preview=1", { repositories });
    expect(await screen.findByText("클릭 배틀 이벤트 · 22:00까지")).toBeInTheDocument();
    expect(screen.getByText("참가자 모집 중")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "평소 포스터" })).toBeNull();
    expect(screen.getByRole("button", { name: "다음 화면" })).toBeDisabled();
    expect(screen.getByText("시간대 고정")).toBeInTheDocument();
  });

  it("게임 화면을 열어 둔 상태에서도 22시 서버 시각을 받으면 평소 편성으로 복귀한다", async () => {
    const repositories = eventRepositories("2026-11-02T21:00:00+09:00");
    const playlist = await repositories.displays.getPlaylist("device-preview");
    renderRoute("/display/device-preview", { repositories });
    await screen.findByText("클릭 배틀 이벤트 · 22:00까지");
    vi.mocked(repositories.displays.getPlaylist).mockResolvedValue({
      ...playlist,
      serverTime: new Date("2026-11-02T22:00:00+09:00"),
    });
    fireEvent(window, new Event("visibilitychange"));
    expect(await screen.findByRole("heading", { name: "평소 포스터" })).toBeInTheDocument();
    expect(screen.queryByText("클릭 배틀 이벤트 · 22:00까지")).toBeNull();
    expect(screen.queryByText("참가자 모집 중")).toBeNull();
  });

  it.each([
    "2026-11-01T21:00:00+09:00",
    "2026-11-02T19:59:00+09:00",
    "2026-11-02T22:00:00+09:00",
    "2026-11-08T21:00:00+09:00",
  ])("%s 에는 평소 편성을 재생한다", async (now) => {
    renderRoute("/display/device-preview", { repositories: eventRepositories(now) });
    expect(await screen.findByRole("heading", { name: "평소 포스터" })).toBeInTheDocument();
    expect(screen.queryByText("클릭 배틀 이벤트 · 22:00까지")).toBeNull();
  });
});
