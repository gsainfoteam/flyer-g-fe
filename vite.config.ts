/// <reference types="vitest/config" />
import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import type { Plugin } from "vite";

/**
 * 빌드마다 다른 식별자. 번들에 박아 두고 `version.json`으로도 내보내서, 오래 켜
 * 둔 TV가 새 배포를 알아채고 스스로 새로고침하게 한다.
 * (`src/features/display-runtime/model/use-new-build-reload.ts`)
 */
const BUILD_ID = new Date().toISOString();

/** 앱 버전의 단일 원천은 package.json이다. 화면·heartbeat가 같은 값을 쓴다. */
const APP_VERSION = (
  JSON.parse(
    readFileSync(new URL("./package.json", import.meta.url), "utf8"),
  ) as { version: string }
).version;

function emitBuildVersion(): Plugin {
  return {
    name: "flyer-g:emit-build-version",
    apply: "build",
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "version.json",
        source: JSON.stringify({ buildId: BUILD_ID }),
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), emitBuildVersion()],
  define: {
    __APP_BUILD_ID__: JSON.stringify(BUILD_ID),
    __APP_VERSION__: JSON.stringify(APP_VERSION),
  },
  server: {
    // 실행 환경이 PORT를 지정하면 그 포트를 쓴다. (미리보기 도구, 컨테이너 등)
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    restoreMocks: true,
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
});
