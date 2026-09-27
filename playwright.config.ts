import { defineConfig, devices } from "@playwright/test";

/**
 * E2E는 mock repository 위에서 돈다 (Phase 07).
 *
 * 같은 시나리오를 실제 API(스테이징)로 재실행하는 것은 Phase 08 몫이며, 그때는
 * baseURL과 인증 준비만 바꾼다. mock 데이터는 탭(페이지) 단위 in-memory이므로
 * 상태를 이어가는 시나리오는 page.goto 대신 앱 내 이동을 쓴다 (helpers.ts).
 *
 * `.env`가 실제 API를 가리켜도 mock으로 돌도록 환경변수를 고정하고, 개발 서버(5173)와
 * 겹치지 않는 포트를 쓴다. 같은 포트면 떠 있는 실제 API 서버를 그대로 재사용한다.
 * 단위별 값(`VITE_API_MODE_*`)이 전역 값보다 우선하므로 단위마다 mock으로 적는다.
 */
const E2E_PORT = 5174;
/** `src/shared/config/env.ts`의 `API_UNITS`와 같게 둔다. */
const API_UNITS = [
  "UPLOAD",
  "SUBMISSIONS",
  "REVIEWS",
  "REFERENCE",
  "DEVICES",
  "DISPLAY",
] as const;
const MOCK_ENV = {
  VITE_DEMO_MODE: "false",
  VITE_USE_MOCK_API: "true",
  VITE_USE_MOCK_AUTH: "true",
  ...Object.fromEntries(
    API_UNITS.map((unit) => [`VITE_API_MODE_${unit}`, "mock"]),
  ),
};
const E2E_URL = `http://localhost:${E2E_PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: E2E_URL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `bun run dev --port ${E2E_PORT} --strictPort`,
    url: E2E_URL,
    env: MOCK_ENV,
    reuseExistingServer: !process.env.CI,
    stdout: "ignore",
  },
});
