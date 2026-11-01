import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/shared/api/query-keys";
import { useRepositories } from "@/shared/api/repositories-context";

/**
 * 서버가 날씨를 주지 않을 때 TV가 직접 받는 날씨(Open-Meteo).
 *
 * 30분마다 다시 받는다. 날씨는 그보다 자주 바뀌지 않고, TV마다 따로 부르므로 호출을
 * 아낀다. 마지막으로 받은 것을 기기에 남겨 네트워크가 끊겨도 쓴다. 오래된 값은
 * `buildWeatherContent`가 받은 시각으로 걸러 낸다.
 */
const REFRESH_MS = 30 * 60 * 1000;
const CACHE_KEY = "flyerg:local-weather";

function readCache(): Record<string, unknown> | null {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export function useLocalWeather(enabled: boolean): Record<string, unknown> | null {
  const { widgets } = useRepositories();
  const [cached] = useState(readCache);
  const query = useQuery({
    queryKey: queryKeys.displays.localWeather(),
    queryFn: ({ signal }) => widgets.getLocalWeather(signal),
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
      // 저장소가 막혀도 이번 화면에서는 받은 날씨를 쓴다.
    }
  }, [query.data]);

  return enabled ? (query.data ?? cached) : null;
}
