import { describe, expect, it } from "vitest";
import { EnvConfigError, readAppEnv } from "./env";

describe("readAppEnv", () => {
  it("개발 환경은 기본으로 mock을 쓴다", () => {
    expect(readAppEnv({ PROD: false })).toEqual({
      apiBaseUrl: null,
      useMockApi: true,
      isProduction: false,
    });
  });

  it("production에서 mock을 켜면 시작 시점에 막는다", () => {
    expect(() =>
      readAppEnv({ PROD: true, VITE_USE_MOCK_API: "true" }),
    ).toThrow(EnvConfigError);
  });

  it("실제 API 모드에는 base URL이 반드시 필요하다", () => {
    expect(() => readAppEnv({ PROD: true, VITE_USE_MOCK_API: "false" })).toThrow(
      EnvConfigError,
    );
  });

  it("HTTPS가 아닌 base URL을 막고 localhost만 예외로 둔다", () => {
    expect(() =>
      readAppEnv({
        PROD: true,
        VITE_USE_MOCK_API: "false",
        VITE_API_BASE_URL: "http://api.example.com",
      }),
    ).toThrow(EnvConfigError);

    expect(
      readAppEnv({
        PROD: false,
        VITE_USE_MOCK_API: "false",
        VITE_API_BASE_URL: "http://localhost:3000",
      }).apiBaseUrl,
    ).toBe("http://localhost:3000");
  });

  it("base URL 끝의 슬래시를 정리한다", () => {
    expect(
      readAppEnv({
        PROD: true,
        VITE_USE_MOCK_API: "false",
        VITE_API_BASE_URL: "https://api.example.com/v1/",
      }).apiBaseUrl,
    ).toBe("https://api.example.com/v1");
  });

  it("불리언이 아닌 값을 거부한다", () => {
    expect(() => readAppEnv({ PROD: false, VITE_USE_MOCK_API: "yes" })).toThrow(
      EnvConfigError,
    );
  });
});
