import { render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PosterRenderModel } from "@/entities/poster";
import { DisplayStage } from "@/entities/poster/ui/DisplayStage";
import { ScaledStage } from "@/entities/poster/ui/ScaledStage";

function poster(id: string): PosterRenderModel {
  return {
    id,
    title: `포스터 ${id}`,
    subtitle: null,
    categoryName: "공지",
    organizationName: "가상 조직",
    location: null,
    posterUrl: `/posters/${id}.webp`,
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

describe("4분할", () => {
  it("포스터가 모자라도 칸은 넷이고 빈 칸은 안내로 채운다", () => {
    const { container } = render(
      <DisplayStage
        layout="FOUR_GRID"
        posters={[poster("a"), poster("b")]}
        totalCount={6}
        deviceLabel="A동 로비"
        serverTime={new Date("2026-06-08T03:00:00Z")}
      />,
    );

    expect(screen.getAllByRole("article")).toHaveLength(2);
    const grid = container.querySelector(".grid-cols-4")!;
    expect(grid.children).toHaveLength(4);
    expect(within(grid as HTMLElement).getAllByText(/여기에 함께 걸 수 있어요/)).toHaveLength(2);
  });

  it("게시 건수는 지금 페이지가 아니라 편성 전체를 센다", () => {
    render(
      <DisplayStage
        layout="FOUR_GRID"
        posters={[poster("a"), poster("b")]}
        totalCount={6}
        deviceLabel="A동 로비"
        serverTime={new Date("2026-06-08T03:00:00Z")}
      />,
    );

    expect(screen.getByText("A동 로비 · 게시 중 6건")).toBeInTheDocument();
  });
});
