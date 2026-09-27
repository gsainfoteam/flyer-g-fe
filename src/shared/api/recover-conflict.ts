import { normalizeApiError } from "./error";
import type { ApiError } from "./error";

/**
 * 결과를 모르는 요청을 다시 보냈다가 409를 받았을 때 실제 결과를 확인한다.
 *
 * 승인·반려·중단·취소는 서버가 같은 key의 재요청에 처음 응답을 돌려주지 않는다
 * (`API-FOLLOWUP-2026-09.md` 2-1, 백엔드에 요청해 둠). 그래서 응답을 못 받고 다시
 * 누르면 첫 요청이 이미 처리되어 409가 온다. 이때 최신 상태를 불러와 바라던 상태면
 * 성공으로 본다. 처음 보낸 요청의 409는 진짜 충돌이라 그대로 던진다.
 */
export interface ConflictRecovery<T> {
  /** 이 시도 key로 결과를 모르는 요청이 있었는가 */
  hadUnknownOutcome: () => boolean;
  markOutcomeUnknown: () => void;
  /** 최신 상태 */
  reload: () => Promise<T>;
  /** 최신 상태가 바라던 결과인가 */
  succeeded: (latest: T) => boolean;
}

export async function runWithConflictRecovery<T>(
  run: () => Promise<T>,
  recovery: ConflictRecovery<T>,
): Promise<T> {
  try {
    return await run();
  } catch (cause) {
    const error: ApiError = normalizeApiError(cause);
    if (error.kind === "network" || error.kind === "timeout") {
      recovery.markOutcomeUnknown();
    } else if (error.code === "CONFLICT" && recovery.hadUnknownOutcome()) {
      const latest = await recovery.reload().catch(() => null);
      if (latest !== null && recovery.succeeded(latest)) return latest;
    }
    throw error;
  }
}
