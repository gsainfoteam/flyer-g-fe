import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PosterRenderModel } from "@/entities/poster";
import { DisplayStage } from "@/entities/poster/ui/DisplayStage";
import { spotlightImageSize } from "@/entities/poster/model/spotlight-layout";
import { placeStrip } from "@/entities/poster/model/strip-layout";
import { ScaledStage } from "@/entities/poster/ui/ScaledStage";

function poster(id: string): PosterRenderModel {
  return {
    id,
    title: `포스터 ${id}`,
    subtitle: null,
    categoryName: "공지",
    organizerName: "가상 조직",
    location: null,
    posterUrl: `/posters/${id}.webp`,
    width: 1080,
    height: 1440,
    detailUrl: `https://ziggle.gistory.me/notice/${id}`,
    startAt: new Date("2026-06-01T00:00:00Z"),
    endAt: new Date("2026-06-30T00:00:00Z"),
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ScaledStage", () => {
  function renderAt(width: number, height: number) {
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        disconnect() {}
      },
    );
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      width,
      height,
    } as DOMRect);
    render(
      <ScaledStage>
        <p>스테이지</p>
      </ScaledStage>,
    );
    return screen.getByText("스테이지").parentElement!.style.transform;
  }

  // 720p TV의 CSS 뷰포트는 1280x720이다. 고정 px 그대로면 QR이 화면 밖으로 나간다.
  it("1920x1080 스테이지를 화면에 맞춰 줄인다", () => {
    expect(renderAt(1280, 720)).toContain(`scale(${1280 / 1920})`);
  });

  it("비율이 다른 화면에서는 작은 쪽에 맞추고 남는 쪽을 비운다", () => {
    // 세로로 긴 화면: 가로에 맞춘다.
    expect(renderAt(1080, 1920)).toContain(`scale(${1080 / 1920})`);
  });

  it("4K 뷰포트에서는 키운다", () => {
    expect(renderAt(3840, 2160)).toContain("scale(2)");
  });
});

describe("모아 보기", () => {
  it("이 쪽의 게시물을 모두 제목과 함께 보여 주고, 건수는 편성 전체를 센다", () => {
    render(
      <DisplayStage
        frame={{
          kind: "wall",
          key: "wall:a",
          posters: [poster("a"), poster("b")],
        }}
        posters={[poster("a"), poster("b"), poster("c")]}
        deviceLabel="A동 로비"
        serverTime={new Date("2026-06-08T03:00:00Z")}
      />,
    );

    expect(screen.getAllByRole("figure")).toHaveLength(2);
    expect(screen.getByText("포스터 a")).toBeInTheDocument();
    expect(screen.getByText("게시 중 3건")).toBeInTheDocument();
    // 벽에는 QR이 없다. QR은 크게 보기가 맡는다.
    expect(screen.queryByText("Ziggle에서 자세히 보기")).toBeNull();
  });
});

describe("크게 보기", () => {
  it("제목·장소와 QR을 보여 주고 다음 차례를 머리에 둔다", () => {
    render(
      <DisplayStage
        frame={{
          kind: "spotlight",
          key: "spot:a",
          poster: { ...poster("a"), location: "대강당" },
          upNext: [poster("b")],
        }}
        posters={[poster("a"), poster("b")]}
        deviceLabel="A동 로비"
        serverTime={new Date("2026-06-08T03:00:00Z")}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "포스터 a" }),
    ).toBeInTheDocument();
    expect(screen.getByText("대강당")).toBeInTheDocument();
    expect(screen.getByText("Ziggle에서 자세히 보기")).toBeInTheDocument();
    expect(screen.getByText("다음")).toBeInTheDocument();
  });

  it("상세 링크가 없으면 QR 칸을 그리지 않는다", () => {
    render(
      <DisplayStage
        frame={{
          kind: "spotlight",
          key: "spot:a",
          poster: { ...poster("a"), detailUrl: null },
          upNext: [],
        }}
        posters={[poster("a")]}
        deviceLabel={null}
        serverTime={null}
      />,
    );

    expect(screen.queryByText("Ziggle에서 자세히 보기")).toBeNull();
  });

  it("세로·정방형은 이미지를 옆에, 넓은 배너는 위에 둔다", () => {
    const portrait = spotlightImageSize({
      ...poster("a"),
      width: 1080,
      height: 1440,
    });
    expect(portrait).toMatchObject({ stacked: false, height: 832 });
    expect(portrait.width).toBeCloseTo(624);

    const square = spotlightImageSize({
      ...poster("a"),
      width: 1080,
      height: 1080,
    });
    expect(square).toMatchObject({ stacked: false, width: 832, height: 832 });

    const banner = spotlightImageSize({
      ...poster("a"),
      width: 3000,
      height: 1000,
    });
    expect(banner).toMatchObject({ stacked: true, width: 1680, height: 560 });
  });
});

describe("흐르는 띠", () => {
  it("가운데 한 건의 제목과 QR을 보여 준다", () => {
    render(
      <DisplayStage
        frame={{ kind: "strip", key: "strip:b", focusIndex: 1 }}
        posters={[poster("a"), poster("b"), poster("c")]}
        deviceLabel="A동 로비"
        serverTime={new Date("2026-06-08T03:00:00Z")}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "포스터 b" }),
    ).toBeInTheDocument();
    expect(screen.getByText("2 / 3")).toBeInTheDocument();
  });

  it("가운데 칸을 화면 가운데에 두고 양옆을 잇는다", () => {
    const items = placeStrip(["a", "b", "c", "d", "e", "f"].map(poster), 0);
    const focus = items[0]!;
    expect(focus.poster.id).toBe("a");
    expect(focus.x + focus.width / 2).toBeCloseTo(960);
    expect(items.find((item) => item.offset === 1)?.poster.id).toBe("b");
    expect(items.find((item) => item.offset === -1)?.poster.id).toBe("f");
  });

  it("게시물이 적으면 같은 게시물을 한 화면에 두 번 놓지 않는다", () => {
    const items = placeStrip([poster("a"), poster("b")], 0);
    expect(items.map((item) => item.poster.id)).toEqual(["a", "b"]);
  });
});
