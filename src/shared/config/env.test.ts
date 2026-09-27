import { describe, expect, it } from "vitest";
import { API_UNITS, EnvConfigError, readAppEnv } from "./env";
import type { ApiMode, ApiUnit } from "./env";

const allModes = (mode: ApiMode) =>
  Object.fromEntries(API_UNITS.map((unit) => [unit, mode])) as Record<
    ApiUnit,
    ApiMode
  >;

/** 실제 로그인에 필요한 값. 테스트용이며 실제 제공자에 등록된 값이 아니다. */
const REAL_AUTH = {
  VITE_API_BASE_URL: "https://api.example.com",
  VITE_USE_MOCK_AUTH: "false",
  VITE_AUTH_CLIENT_ID: "test-client",
  VITE_AUTH_REDIRECT_URI: "https://app.example.com/auth/callback",
};

describe("readAppEnv", () => {
  it("개발 환경은 기본으로 mock을 쓴다", () => {
    expect(readAppEnv({ PROD: false })).toEqual({
      apiBaseUrl: null,
      apiModes: allModes("mock"),
      useMockApi: true,
      useMockAuth: true,
      auth: null,
      isDemo: false,
      isProduction: false,
    });
  });

  it("데모가 아닌 production에서 mock을 켜면 시작 시점에 막는다", () => {
    expect(() =>
      readAppEnv({
        PROD: true,
        VITE_DEMO_MODE: "false",
        VITE_USE_MOCK_API: "true",
      }),
    ).toThrow(EnvConfigError);

    // mock 세션도 마찬가지다. 개발용 역할 전환이 운영에 새어 나가면 안 된다.
    expect(() =>
      readAppEnv({
        PROD: true,
        VITE_DEMO_MODE: "false",
        VITE_USE_MOCK_API: "false",
        VITE_USE_MOCK_AUTH: "true",
        VITE_API_BASE_URL: "https://api.example.com",
      }),
    ).toThrow(EnvConfigError);
  });

  it("데모 빌드는 production에서도 mock을 허용하고 mock을 기본값으로 쓴다", () => {
    // 백엔드 없이 UI를 보여주는 배포(Cloudflare Pages 등)를 위한 명시적 opt-in.
    expect(readAppEnv({ PROD: true, VITE_DEMO_MODE: "true" })).toEqual({
      apiBaseUrl: null,
      apiModes: allModes("mock"),
      useMockApi: true,
      useMockAuth: true,
      auth: null,
      isDemo: true,
      isProduction: true,
    });
  });

  it("production은 기본으로 모든 단위가 실제 API이고, 설정이 빠지면 시작 시점에 막는다", () => {
    expect(() => readAppEnv({ PROD: true })).toThrow(EnvConfigError);

    const env = readAppEnv({
      PROD: true,
      VITE_API_BASE_URL: "https://api.example.com",
      VITE_AUTH_CLIENT_ID: "flyer-g",
      VITE_AUTH_REDIRECT_URI: "https://flyer.example.com/auth/callback",
    });
    expect(env).toMatchObject({
      isDemo: false,
      apiModes: allModes("real"),
      useMockApi: false,
      useMockAuth: false,
    });
  });

  it("데모 배포는 VITE_DEMO_MODE=true로 명시할 때만 mock으로 뜬다", () => {
    expect(readAppEnv({ PROD: true, VITE_DEMO_MODE: "true" })).toMatchObject({
      isDemo: true,
      useMockApi: true,
      useMockAuth: true,
    });
  });

  it("데모를 끄면 production mock 금지 검증이 그대로 동작한다", () => {
    expect(() =>
      readAppEnv({
        PROD: true,
        VITE_DEMO_MODE: "false",
        VITE_USE_MOCK_API: "true",
      }),
    ).toThrow(EnvConfigError);
  });

  it("실제 API 모드에는 base URL이 반드시 필요하다", () => {
    expect(() =>
      readAppEnv({
        PROD: true,
        VITE_USE_MOCK_API: "false",
        ...REAL_AUTH,
        VITE_API_BASE_URL: "",
      }),
    ).toThrow(/VITE_API_BASE_URL/);
  });

  it("HTTPS가 아닌 base URL을 막고 localhost만 예외로 둔다", () => {
    expect(() =>
      readAppEnv({
        PROD: true,
        VITE_USE_MOCK_API: "false",
        ...REAL_AUTH,
        VITE_API_BASE_URL: "http://api.example.com",
      }),
    ).toThrow(/HTTPS/);

    expect(
      readAppEnv({
        PROD: false,
        VITE_USE_MOCK_API: "false",
        ...REAL_AUTH,
        VITE_API_BASE_URL: "http://localhost:3000",
      }).apiBaseUrl,
    ).toBe("http://localhost:3000");
  });

  it("base URL 끝의 슬래시를 정리한다", () => {
    expect(
      readAppEnv({
        PROD: true,
        VITE_USE_MOCK_API: "false",
        ...REAL_AUTH,
        VITE_API_BASE_URL: "https://api.example.com/v1/",
      }).apiBaseUrl,
    ).toBe("https://api.example.com/v1");
  });

  it("불리언이 아닌 값을 거부한다", () => {
    expect(() => readAppEnv({ PROD: false, VITE_USE_MOCK_API: "yes" })).toThrow(
      EnvConfigError,
    );
  });

  describe("단위별 연동 (Phase 08)", () => {
    it("단위 하나만 real로 두고 나머지는 mock으로 쓴다", () => {
      const env = readAppEnv({
        PROD: false,
        VITE_API_BASE_URL: "http://localhost:3000",
        VITE_API_MODE_DISPLAY: "real",
      });
      expect(env.apiModes).toEqual({ ...allModes("mock"), display: "real" });
      expect(env.useMockApi).toBe(false);
      // 기기 토큰으로 인증하는 단위라 mock 세션과 함께 쓸 수 있다.
      expect(env.useMockAuth).toBe(true);
    });

    it("VITE_USE_MOCK_API는 단위별 값이 없을 때의 기본값이다", () => {
      const env = readAppEnv({
        PROD: false,
        VITE_USE_MOCK_API: "false",
        VITE_API_MODE_UPLOAD: "mock",
        ...REAL_AUTH,
      });
      expect(env.apiModes).toEqual({ ...allModes("real"), upload: "mock" });
    });

    it("mock도 real도 아닌 값을 거부한다", () => {
      expect(() =>
        readAppEnv({ PROD: false, VITE_API_MODE_REVIEWS: "on" }),
      ).toThrow(/VITE_API_MODE_REVIEWS/);
    });

    it("로그인이 필요한 단위를 real로 두면 mock 세션을 쓸 수 없다", () => {
      // 실제 서버는 mock 세션을 모르므로 모든 요청이 401이 된다.
      expect(() =>
        readAppEnv({
          PROD: false,
          VITE_API_BASE_URL: "http://localhost:3000",
          VITE_API_MODE_SUBMISSIONS: "real",
        }),
      ).toThrow(/VITE_USE_MOCK_AUTH/);
    });

    it("데모가 아닌 production은 한 단위라도 mock이면 막는다", () => {
      expect(() =>
        readAppEnv({
          PROD: true,
          VITE_DEMO_MODE: "false",
          VITE_USE_MOCK_API: "false",
          VITE_API_MODE_DEVICES: "mock",
          ...REAL_AUTH,
        }),
      ).toThrow(/devices/);
    });
  });

  describe("로그인 설정", () => {
    it("실제 로그인은 client_id와 redirect_uri를 읽는다", () => {
      const env = readAppEnv({ PROD: false, ...REAL_AUTH });
      expect(env.auth).toEqual({
        clientId: "test-client",
        redirectUri: "https://app.example.com/auth/callback",
      });
    });

    it("실제 로그인에 값이 없으면 시작 시점에 막는다", () => {
      expect(() =>
        readAppEnv({
          PROD: false,
          VITE_API_BASE_URL: "https://api.example.com",
          VITE_USE_MOCK_AUTH: "false",
          VITE_AUTH_CLIENT_ID: "test-client",
        }),
      ).toThrow(/VITE_AUTH_REDIRECT_URI/);
    });

    it("redirect_uri도 HTTPS만 받고 localhost만 예외로 둔다", () => {
      expect(() =>
        readAppEnv({
          PROD: false,
          ...REAL_AUTH,
          VITE_AUTH_REDIRECT_URI: "http://app.example.com/auth/callback",
        }),
      ).toThrow(/HTTPS/);

      expect(
        readAppEnv({
          PROD: false,
          ...REAL_AUTH,
          VITE_AUTH_REDIRECT_URI: "http://localhost:5173/auth/callback",
        }).auth?.redirectUri,
      ).toBe("http://localhost:5173/auth/callback");
    });

    it("redirect_uri 경로는 로그인 결과를 받는 화면이어야 한다", () => {
      expect(() =>
        readAppEnv({
          PROD: false,
          ...REAL_AUTH,
          VITE_AUTH_REDIRECT_URI: "https://app.example.com/login",
        }),
      ).toThrow(/\/auth\/callback/);
    });

    it("실제 로그인에는 API 주소가 필요하다", () => {
      // 토큰은 백엔드가 발급한다. 데이터가 전부 mock이어도 로그인은 서버가 한다.
      expect(() =>
        readAppEnv({ PROD: false, ...REAL_AUTH, VITE_API_BASE_URL: "" }),
      ).toThrow(/VITE_API_BASE_URL/);
    });

    it("mock 세션이면 로그인 값이 없어도 된다", () => {
      expect(readAppEnv({ PROD: false }).auth).toBeNull();
    });
  });
});
