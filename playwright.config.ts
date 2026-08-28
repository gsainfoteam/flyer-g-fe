import { defineConfig, devices } from "@playwright/test";

/**
 * E2E는 mock repository 위에서 돈다 (Phase 07).
 *
 * 같은 시나리오를 실제 API(스테이징)로 재실행하는 것은 Phase 08 몫이며, 그때는
 * baseURL과 인증 준비만 바꾼다. mock 데이터는 탭(페이지) 단위 in-memory이므로
 * 상태를 이어가는 시나리오는 page.goto 대신 앱 내 이동을 쓴다 (helpers.ts).
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "bun run dev",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    stdout: "ignore",
  },
});
