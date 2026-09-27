/**
 * 런타임 환경 변수 파싱과 검증.
 * production에서 mock이 켜지는 사고를 빌드가 아니라 시작 시점에 막는다.
 * 명세 Phase 07 인수 조건 "production build에서 mock API/auth가 사용되지 않는다"
 *
 * 유일한 예외가 `VITE_DEMO_MODE=true` 데모 빌드다. 백엔드 없이 UI mock을
 * 그대로 배포해 보여주기 위한 것으로, 실수로 켜질 수 없게 명시적 opt-in만 받는다.
 *
 * 실제 API 연동(Phase 08)은 한 번에 넘어가지 않고 단위별로 진행한다. 그래서 mock
 * 여부를 `VITE_USE_MOCK_API` 하나로 정하지 않고 단위마다 고를 수 있게 한다.
 * (`docs/frontend-phases/phase-08-real-api-integration.md` 2절)
 */

import { paths } from "./routes";

/**
 * 따로 연동하는 API 단위. 인증은 `VITE_USE_MOCK_AUTH`가 따로 정한다.
 *
 * - `upload`: 포스터 업로드 (`API-REQUIREMENTS.md` 4절)
 * - `submissions`: 게시 신청과 운영 요약 (5, 7절)
 * - `reviews`: 검토와 처리 이력 (6절)
 * - `reference`: 카테고리·대상 그룹·운영 제한값 (10절)
 * - `devices`: 기기 목록과 관리 (11.1절)
 * - `display`: TV 편성과 상태 보고 (8, 9절). 사용자 세션이 아니라 기기 토큰을 쓴다
 */
export const API_UNITS = [
  "upload",
  "submissions",
  "reviews",
  "reference",
  "devices",
  "display",
] as const;
export type ApiUnit = (typeof API_UNITS)[number];

export type ApiMode = "mock" | "real";

/** 사용자 로그인 없이 동작하는 단위. 나머지는 실제 서버가 Bearer 토큰을 요구한다. */
const DEVICE_AUTH_UNITS: readonly ApiUnit[] = ["display"];

/** 로그인 제공자(account.gistory.me)에 등록한 이 앱의 값 */
export interface AuthConfig {
  clientId: string;
  /** 로그인 후 돌아올 주소. 제공자에 등록한 값과 정확히 같아야 한다. */
  redirectUri: string;
}

export interface AppEnv {
  /** 실제 API base URL. 모든 단위가 mock이면 null일 수 있다. */
  apiBaseUrl: string | null;
  /** 단위별 mock/real. 하나라도 real이면 `apiBaseUrl`이 있다. */
  apiModes: Record<ApiUnit, ApiMode>;
  /** 모든 단위가 mock인가. 전부 mock일 때만 쓰는 개발 도구가 이 값을 본다. */
  useMockApi: boolean;
  /** 개발용 mock 세션 사용 여부. 역할 전환 UI도 이 값에 따라 노출된다. */
  useMockAuth: boolean;
  /** 실제 로그인 설정. mock 세션이면 null이다. */
  auth: AuthConfig | null;
  /** mock을 그대로 배포하는 데모 빌드. production mock 금지 규칙의 유일한 예외. */
  isDemo: boolean;
  isProduction: boolean;
}

export class EnvConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EnvConfigError";
  }
}

type ApiModeEnvKey = `VITE_API_MODE_${Uppercase<ApiUnit>}`;

export type RawEnv = {
  VITE_API_BASE_URL?: string;
  VITE_USE_MOCK_API?: string;
  VITE_USE_MOCK_AUTH?: string;
  VITE_AUTH_CLIENT_ID?: string;
  VITE_AUTH_REDIRECT_URI?: string;
  VITE_DEMO_MODE?: string;
  PROD?: boolean;
} & Partial<Record<ApiModeEnvKey, string>>;

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === "") return fallback;
  if (value === "true" || value === "1") return true;
  if (value === "false" || value === "0") return false;
  throw new EnvConfigError(
    `불리언 환경 변수 값이 올바르지 않습니다: ${value} (true 또는 false)`,
  );
}

function parseApiMode(
  key: ApiModeEnvKey,
  value: string | undefined,
  fallback: ApiMode,
): ApiMode {
  const trimmed = value?.trim();
  if (!trimmed) return fallback;
  if (trimmed === "mock" || trimmed === "real") return trimmed;
  throw new EnvConfigError(
    `${key} 값이 올바르지 않습니다: ${trimmed} (mock 또는 real)`,
  );
}

/** HTTPS만 허용한다. 로컬 개발 서버(localhost)만 예외다. */
function parseSecureUrl(name: string, value: string | undefined): URL | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new EnvConfigError(`${name}이 URL 형식이 아닙니다: ${trimmed}`);
  }
  if (url.protocol !== "https:" && url.hostname !== "localhost") {
    throw new EnvConfigError(
      `${name}은 HTTPS여야 합니다. localhost만 예외입니다.`,
    );
  }
  return url;
}

function parseAuthConfig(raw: RawEnv): AuthConfig {
  const clientId = raw.VITE_AUTH_CLIENT_ID?.trim();
  const redirectUri = parseSecureUrl(
    "VITE_AUTH_REDIRECT_URI",
    raw.VITE_AUTH_REDIRECT_URI,
  );
  if (!clientId || redirectUri === null) {
    throw new EnvConfigError(
      "실제 로그인에는 VITE_AUTH_CLIENT_ID와 VITE_AUTH_REDIRECT_URI가 반드시 필요합니다.",
    );
  }
  if (redirectUri.pathname !== paths.authCallback) {
    throw new EnvConfigError(
      `VITE_AUTH_REDIRECT_URI의 경로는 ${paths.authCallback}여야 합니다. 로그인 후 그 경로가 결과를 받습니다.`,
    );
  }
  // 제공자는 등록한 문자열과 정확히 비교한다. 정규화하지 않고 입력 그대로 쓴다.
  return { clientId, redirectUri: raw.VITE_AUTH_REDIRECT_URI!.trim() };
}

export function readAppEnv(raw: RawEnv): AppEnv {
  const isProduction = raw.PROD === true;
  // TODO(Phase 08): 실제 API 연동 시작과 함께 기본값을 false로 되돌린다.
  // 백엔드가 없는 지금은 어떤 배포든 mock 데모가 유일하게 동작하는 형태라
  // 별도 환경 변수 없이도 배포가 뜨도록 잠시 기본을 데모로 둔다.
  const isDemo = parseBoolean(raw.VITE_DEMO_MODE, true);
  // 데모 빌드는 백엔드 없이 배포하는 것이 목적이므로 mock이 기본이다.
  const mockByDefault = parseBoolean(
    raw.VITE_USE_MOCK_API,
    !isProduction || isDemo,
  );
  const useMockAuth = parseBoolean(
    raw.VITE_USE_MOCK_AUTH,
    !isProduction || isDemo,
  );
  const apiBaseUrl = parseSecureUrl("VITE_API_BASE_URL", raw.VITE_API_BASE_URL)
    ? raw.VITE_API_BASE_URL!.trim().replace(/\/+$/, "")
    : null;

  const apiModes = Object.fromEntries(
    API_UNITS.map((unit) => {
      const key = `VITE_API_MODE_${unit.toUpperCase()}` as ApiModeEnvKey;
      return [
        unit,
        parseApiMode(key, raw[key], mockByDefault ? "mock" : "real"),
      ];
    }),
  ) as Record<ApiUnit, ApiMode>;
  const mockUnits = API_UNITS.filter((unit) => apiModes[unit] === "mock");
  const realUnits = API_UNITS.filter((unit) => apiModes[unit] === "real");

  if (isProduction && !isDemo && mockUnits.length > 0) {
    throw new EnvConfigError(
      `production 빌드에서는 mock API를 사용할 수 없습니다 (${mockUnits.join(", ")}). 모든 단위를 real로 두거나, 데모 배포라면 VITE_DEMO_MODE=true를 명시하세요.`,
    );
  }
  if (isProduction && !isDemo && useMockAuth) {
    throw new EnvConfigError(
      "production 빌드에서는 mock 세션을 사용할 수 없습니다. VITE_USE_MOCK_AUTH를 false로 두거나, 데모 배포라면 VITE_DEMO_MODE=true를 명시하세요.",
    );
  }
  if (realUnits.length > 0 && apiBaseUrl === null) {
    throw new EnvConfigError(
      "실제 API 모드에서는 VITE_API_BASE_URL이 반드시 필요합니다.",
    );
  }
  if (!useMockAuth && apiBaseUrl === null) {
    throw new EnvConfigError(
      "실제 로그인은 백엔드가 토큰을 발급하므로 VITE_API_BASE_URL이 반드시 필요합니다.",
    );
  }
  // 실제 서버는 mock 세션을 모른다. 로그인이 필요한 단위만 real로 두면 전부 401이다.
  const needsSession = realUnits.filter(
    (unit) => !DEVICE_AUTH_UNITS.includes(unit),
  );
  if (useMockAuth && needsSession.length > 0) {
    throw new EnvConfigError(
      `로그인이 필요한 API(${needsSession.join(", ")})를 real로 쓰려면 실제 로그인이 필요합니다. VITE_USE_MOCK_AUTH=false로 두세요.`,
    );
  }

  return {
    apiBaseUrl,
    apiModes,
    useMockApi: realUnits.length === 0,
    useMockAuth,
    auth: useMockAuth ? null : parseAuthConfig(raw),
    isDemo,
    isProduction,
  };
}

/** 이 단위를 mock으로 쓰는가. adapter를 고르는 곳에서 쓴다. */
export function isMockUnit(env: AppEnv, unit: ApiUnit): boolean {
  return env.apiModes[unit] === "mock";
}

let cached: AppEnv | null = null;

/** 앱 전역에서 쓰는 환경 설정. 최초 1회만 파싱한다. */
export function getAppEnv(): AppEnv {
  if (cached === null) cached = readAppEnv(import.meta.env as RawEnv);
  return cached;
}
