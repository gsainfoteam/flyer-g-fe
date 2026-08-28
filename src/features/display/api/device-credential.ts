import type { AppEnv } from "@/shared/config/env";

/**
 * 기기 자격 증명 경계 (명세 3.1, FR-PLY-01).
 *
 * TV는 사용자 세션이 아니라 기기 전용 자격 증명으로 편성을 받는다. 실제 전달
 * 방식(발급·저장·헤더 이름)은 미확정이다(`API-REQUIREMENTS.md` 8절). 화면과
 * repository는 이 인터페이스만 알고, 계약이 확정되면 구현체만 바꾼다.
 *
 * 규칙:
 * - 자격 증명을 URL query에 넣지 않는다. 공개 화면의 주소가 노출된다.
 * - 실패해도 자격 증명 값이나 내부 오류를 화면에 노출하지 않는다.
 */
export interface DeviceCredentialProvider {
  /**
   * 요청에 실을 자격 증명. 없으면 null이며, 호출부는 인증 없이 요청하거나
   * 안전한 fallback 화면을 유지한다.
   */
  getCredential(deviceId: string): Promise<string | null>;
}

/** 개발용. mock repository는 인증을 요구하지 않으므로 빈 값을 돌려준다. */
export function createMockDeviceCredentialProvider(): DeviceCredentialProvider {
  return {
    async getCredential() {
      return null;
    },
  };
}

export function createDeviceCredentialProvider(
  env: AppEnv,
): DeviceCredentialProvider {
  if (env.useMockApi) {
    return createMockDeviceCredentialProvider();
  }

  throw new Error(
    "실제 기기 자격 증명 주입이 아직 연결되지 않았습니다. 전달 방식 확정 후 Phase 08에서 구현합니다.",
  );
}
