import { render, screen } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RouteErrorScreen } from "./RouteErrorScreen";
import { isStaleChunkError, reloadOnceForStaleChunk } from "./stale-chunk";

function renderFailingRoute(error: Error) {
  const Boom = () => {
    throw error;
  };
  const router = createMemoryRouter([
    { path: "/", element: <Boom />, errorElement: <RouteErrorScreen /> },
  ]);
  render(<RouterProvider router={router} />);
}

afterEach(() => {
  sessionStorage.clear();
});

describe("route 오류 화면", () => {
  it("라우터 기본 화면 대신 한국어 안내와 새로고침을 보여준다", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    renderFailingRoute(new Error("Cannot read properties of undefined"));

    expect(
      screen.getByRole("heading", { name: "화면을 여는 중에 문제가 생겼어요" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "새로고침" })).toBeInTheDocument();
    // 오류 내용은 공개 화면에 그리지 않는다.
    expect(screen.queryByText(/Cannot read properties/)).toBeNull();
  });

  it("재배포로 화면 조각을 못 받으면 새 버전이 나왔다고 알린다", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    // 테스트 중 실제로 새로고침하지 않게 이미 새로고침한 것으로 둔다.
    sessionStorage.setItem("flyerg:stale-chunk-reload", String(Date.now()));
    renderFailingRoute(
      new TypeError("Failed to fetch dynamically imported module: /assets/Page-abc.js"),
    );

    expect(
      screen.getByRole("heading", { name: "새 버전이 나왔어요" }),
    ).toBeInTheDocument();
  });
});

describe("재배포 뒤 조각 복구", () => {
  it("브라우저마다 다른 조각 로딩 실패 문구를 알아본다", () => {
    expect(
      isStaleChunkError(new TypeError("Failed to fetch dynamically imported module")),
    ).toBe(true);
    expect(isStaleChunkError(new TypeError("Importing a module script failed."))).toBe(
      true,
    );
    expect(isStaleChunkError(new Error("Network request failed"))).toBe(false);
  });

  it("한 번만 새로고침하고 곧바로 또 실패하면 반복하지 않는다", () => {
    const reload = vi.fn();

    expect(reloadOnceForStaleChunk(reload)).toBe(true);
    expect(reloadOnceForStaleChunk(reload)).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
