import { describe, expect, it, vi } from "vitest";
import { readAppEnv } from "@/shared/config/env";
import type { RawEnv } from "@/shared/config/env";
import { createAppDependencies } from "./create-app-dependencies";

const REAL_AUTH: RawEnv = {
  PROD: false,
  VITE_API_BASE_URL: "https://api.example.com",
  VITE_USE_MOCK_AUTH: "false",
  VITE_AUTH_CLIENT_ID: "test-client",
  VITE_AUTH_REDIRECT_URI: "http://localhost:3000/auth/callback",
};

/** 단위별로 mock과 실제 구현을 섞어 조립한다. (Phase 08 부분 연동) */
describe("createAppDependencies", () => {
  it("연결한 단위는 실제 API를 부른다", async () => {
    const fetchImpl = vi.fn<typeof fetch>(
      async () =>
        new Response(JSON.stringify([{ id: "notice", name: "공지" }]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    vi.stubGlobal("fetch", fetchImpl);
    try {
      const { repositories } = createAppDependencies(
        readAppEnv({ ...REAL_AUTH, VITE_API_MODE_REFERENCE: "real" }),
      );

      await expect(repositories.reference.listCategories()).resolves.toEqual([
        { id: "notice", name: "공지" },
      ]);
      expect(String(fetchImpl.mock.calls[0]![0])).toBe(
        "https://api.example.com/signage/categories",
      );
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("아직 실제 구현이 없는 단위를 real로 두면 시작할 때 알린다", () => {
    expect(() =>
      createAppDependencies(
        readAppEnv({ ...REAL_AUTH, VITE_API_MODE_SUBMISSIONS: "real" }),
      ),
    ).toThrow(/submissions/);
  });
});
