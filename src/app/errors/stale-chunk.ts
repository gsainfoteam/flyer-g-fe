/**
 * 재배포 뒤 옛 화면 조각(chunk)을 못 받을 때의 복구.
 *
 * 화면은 경로별로 나눠 받는다. 탭을 열어 둔 사이 새 버전이 배포되면 옛 파일 이름이
 * 서버에서 사라져, 다음 화면으로 이동할 때 조각을 받지 못한다. 새로고침하면 새
 * 버전으로 다시 받으므로 한 번 자동으로 새로고침한다. 새로고침해도 계속 실패하면
 * 무한 반복하지 않고 오류 화면에 맡긴다.
 */
const RELOAD_MARK_KEY = "flyerg:stale-chunk-reload";
/** 이 시간 안에 이미 새로고침했으면 다시 하지 않는다. */
const RELOAD_COOLDOWN_MS = 60_000;

const CHUNK_ERROR_PATTERNS = [
  /Failed to fetch dynamically imported module/i,
  /Importing a module script failed/i,
  /error loading dynamically imported module/i,
  /Unable to preload CSS/i,
];

export function isStaleChunkError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return CHUNK_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}

/** 최근에 새로고침하지 않았으면 새로고침한다. 새로고침했으면 true. */
export function reloadOnceForStaleChunk(
  reload: () => void = () => window.location.reload(),
): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_MARK_KEY));
    if (Number.isFinite(last) && Date.now() - last < RELOAD_COOLDOWN_MS) {
      return false;
    }
    sessionStorage.setItem(RELOAD_MARK_KEY, String(Date.now()));
  } catch {
    // 저장소를 못 쓰면 반복 여부를 알 수 없다. 새로고침하지 않고 화면에 맡긴다.
    return false;
  }
  reload();
  return true;
}

/** Vite가 조각을 미리 받다 실패하면 알려 준다. 그때 한 번 새로고침한다. */
export function installStaleChunkRecovery(): void {
  window.addEventListener("vite:preloadError", (event) => {
    if (reloadOnceForStaleChunk()) event.preventDefault();
  });
}
