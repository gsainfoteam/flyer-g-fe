import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/shared/api/query-keys";
import { useRepositories } from "@/shared/api/repositories-context";

/**
 * 서버가 학식을 주지 않을 때 같은 도메인 함수(`/api/cafeteria`)에서 받는 이번 주 학식.
 *
 * 함수가 결과를 3시간 캐시하므로 TV는 한 시간에 한 번이면 충분하다. 마지막으로 받은
 * 것을 기기에 남겨 네트워크가 끊겨도 쓴다. 오늘 식단만 쓰므로 지난 주 값은 위젯에서
 * 저절로 빠진다(`cafeteriaDataFor`, `buildCafeteriaContent`).
 */
const REFRESH_MS = 60 * 60 * 1000;
const CACHE_KEY = "flyerg:local-cafeteria";

function readCache(): unknown {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as unknown) : null;
  } catch {
    return null;
  }
}

export function useLocalCafeteria(enabled: boolean): unknown {
  const { widgets } = useRepositories();
  const [cached] = useState(readCache);
  const query = useQuery({
    queryKey: queryKeys.displays.localCafeteria(),
    queryFn: ({ signal }) => widgets.getLocalCafeteria(signal),
    enabled,
    staleTime: REFRESH_MS,
    refetchInterval: REFRESH_MS,
    refetchIntervalInBackground: true,
    retry: 1,
  });

  useEffect(() => {
    if (!query.data) return;
    try {
      window.localStorage.setItem(CACHE_KEY, JSON.stringify(query.data));
    } catch {
      // 저장소가 막혀도 이번 화면에서는 받은 학식을 쓴다.
    }
  }, [query.data]);

  return enabled ? (query.data ?? cached) : null;
}
