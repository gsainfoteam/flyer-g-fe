/**
 * 런타임 환경 변수 파싱과 검증.
 * production에서 mock이 켜지는 사고를 빌드가 아니라 시작 시점에 막는다.
 * 명세 Phase 07 인수 조건 "production build에서 mock API/auth가 사용되지 않는다"
 */
export interface AppEnv {
  /** 실제 API base URL. mock 모드에서는 null일 수 있다. */
  apiBaseUrl: string | null;
  useMockApi: boolean;
  /** 개발용 mock 세션 사용 여부. 역할 전환 UI도 이 값에 따라 노출된다. */
  useMockAuth: boolean;
  isProduction: boolean;
}

export class EnvConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EnvConfigError";
  }
}

export interface RawEnv {
  VITE_API_BASE_URL?: string;
  VITE_USE_MOCK_API?: string;
  VITE_USE_MOCK_AUTH?: string;
  PROD?: boolean;
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === "") return fallback;
  if (value === "true" || value === "1") return true;
  if (value === "false" || value === "0") return false;
  throw new EnvConfigError(
    `불리언 환경 변수 값이 올바르지 않습니다: ${value} (true 또는 false)`,
  );
}

function parseBaseUrl(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new EnvConfigError(`VITE_API_BASE_URL이 URL 형식이 아닙니다: ${trimmed}`);
  }
  if (url.protocol !== "https:" && url.hostname !== "localhost") {
    throw new EnvConfigError(
      "VITE_API_BASE_URL은 HTTPS여야 합니다. localhost만 예외입니다.",
    );
  }
  return trimmed.replace(/\/+$/, "");
}

export function readAppEnv(raw: RawEnv): AppEnv {
  const isProduction = raw.PROD === true;
  const useMockApi = parseBoolean(raw.VITE_USE_MOCK_API, !isProduction);
  const useMockAuth = parseBoolean(raw.VITE_USE_MOCK_AUTH, !isProduction);
  const apiBaseUrl = parseBaseUrl(raw.VITE_API_BASE_URL);

  if (isProduction && useMockApi) {
    throw new EnvConfigError(
      "production 빌드에서는 mock API를 사용할 수 없습니다. VITE_USE_MOCK_API를 false로 두세요.",
    );
  }
  if (isProduction && useMockAuth) {
    throw new EnvConfigError(
      "production 빌드에서는 mock 세션을 사용할 수 없습니다. VITE_USE_MOCK_AUTH를 false로 두세요.",
    );
  }
  if (!useMockApi && apiBaseUrl === null) {
    throw new EnvConfigError(
      "실제 API 모드에서는 VITE_API_BASE_URL이 반드시 필요합니다.",
    );
  }

  return { apiBaseUrl, useMockApi, useMockAuth, isProduction };
}

let cached: AppEnv | null = null;

/** 앱 전역에서 쓰는 환경 설정. 최초 1회만 파싱한다. */
export function getAppEnv(): AppEnv {
  if (cached === null) cached = readAppEnv(import.meta.env as RawEnv);
  return cached;
}
