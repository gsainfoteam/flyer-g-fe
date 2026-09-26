import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { PosterRenderModel } from "@/entities/poster";
import { PosterArtwork } from "@/entities/poster/ui/PosterArtwork";

function poster(id: string, posterUrl: string): PosterRenderModel {
  return {
    id,
    title: `포스터 ${id}`,
    subtitle: null,
    categoryName: "공연",
    organizationName: "피아노 동아리",
    location: null,
    posterUrl,
    detailUrl: "https://ziggle.gistory.me/notice/1",
    startAt: new Date("2026-09-01T00:00:00+09:00"),
    endAt: new Date("2026-09-30T00:00:00+09:00"),
  };
}

describe("PosterArtwork", () => {
  it("이미지를 불러오지 못하면 대체 화면을 보이고 알린다", () => {
    const onLoadError = vi.fn();
    render(
      <PosterArtwork poster={poster("a", "/a.png")} onLoadError={onLoadError} />,
    );

    fireEvent.error(screen.getByRole("img", { name: "포스터 a 포스터" }));

    expect(screen.getByRole("img", { name: "포스터 a 포스터 없음" })).toBeInTheDocument();
    expect(onLoadError).toHaveBeenCalledWith("a");
  });

  // 플레이어는 같은 자리에서 포스터만 바꿔 그린다. 앞 포스터의 실패가
  // 다음 포스터로 넘어가면 이후 전부 "포스터 없음"이 된다.
  it("같은 자리에서 다음 포스터로 바뀌면 다시 이미지를 시도한다", () => {
    const { rerender } = render(<PosterArtwork poster={poster("a", "/a.png")} />);
    fireEvent.error(screen.getByRole("img", { name: "포스터 a 포스터" }));

    rerender(<PosterArtwork poster={poster("b", "/b.png")} />);

    const image = screen.getByRole("img", { name: "포스터 b 포스터" });
    expect(image.tagName).toBe("IMG");
    expect(image).toHaveAttribute("src", "/b.png");
  });
});
