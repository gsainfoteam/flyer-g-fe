import { useEffect, useState } from "react";

/**
 * 값이 `delayMs` 동안 바뀌지 않으면 따라간다. 입력마다 서버에 묻지 않을 때 쓴다.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(id);
  }, [value, delayMs]);

  return debounced;
}
