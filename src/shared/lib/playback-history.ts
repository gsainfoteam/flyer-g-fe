/** 실제 표시한 순서만 보존한다. 이전/다음 탐색은 새 재생 순서를 만들지 않는다. */
export function createPlaybackHistory<T>(limit = 30) {
  const past: T[] = [];
  const future: T[] = [];
  const push = (stack: T[], value: T | undefined) => {
    if (value === undefined) return;
    stack.push(value);
    if (stack.length > limit) stack.shift();
  };
  const move = (
    from: T[], to: T[], current: T | undefined,
    resolve: (entry: T) => T | null,
  ): T | null => {
    while (from.length) {
      const entry = resolve(from.pop()!);
      if (!entry) continue;
      push(to, current);
      return entry;
    }
    return null;
  };
  return {
    record(current: T | undefined) {
      push(past, current);
      future.length = 0;
    },
    previous: (current: T | undefined, resolve: (entry: T) => T | null) =>
      move(past, future, current, resolve),
    next: (current: T | undefined, resolve: (entry: T) => T | null) =>
      move(future, past, current, resolve),
    clear() { past.length = 0; future.length = 0; },
  };
}
