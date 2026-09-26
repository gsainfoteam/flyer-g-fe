import { useEffect } from "react";

/**
 * 새 배포를 알아채고 새로고침한다.
 *
 * TV는 몇 주씩 켜져 있고 새로고침해 줄 사람이 없다. 그대로 두면 고친 버그도,
 * 바뀐 API 계약도 반영되지 않은 옛 번들을 계속 돌린다. 배포마다 바뀌는
 * `version.json`을 주기적으로 확인해 번들의 식별자와 다르면 다시 받는다.
 *
 * 확인에 실패하면(오프라인, 개발 서버) 아무것도 하지 않는다. 오프라인에서
 * 새로고침하면 앱을 다시 받지 못해 화면이 죽는다.
 */
const CHECK_INTERVAL_MS = 10 * 60 * 1000;

export async function fetchDeployedBuildId(
  signal?: AbortSignal,
): Promise<string | null> {
  try {
    const response = await fetch(`/version.json?t=${Date.now()}`, {
      cache: "no-store",
      signal,
    });
    if (!response.ok) return null;
    const body: unknown = await response.json();
    return body &&
      typeof body === "object" &&
      "buildId" in body &&
      typeof body.buildId === "string"
      ? body.buildId
      : null;
  } catch {
    return null;
  }
}

export function useNewBuildReload({
  enabled = true,
  currentBuildId = __APP_BUILD_ID__,
  intervalMs = CHECK_INTERVAL_MS,
  reload = () => window.location.reload(),
}: {
  enabled?: boolean;
  currentBuildId?: string;
  intervalMs?: number;
  reload?: () => void;
} = {}) {
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();

    const check = async () => {
      const deployed = await fetchDeployedBuildId(controller.signal);
      if (deployed && deployed !== currentBuildId && navigator.onLine) reload();
    };

    const id = window.setInterval(() => void check(), intervalMs);
    return () => {
      controller.abort();
      window.clearInterval(id);
    };
  }, [enabled, currentBuildId, intervalMs, reload]);
}
