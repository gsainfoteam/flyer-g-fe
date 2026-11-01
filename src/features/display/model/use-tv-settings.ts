import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TIME_SLOTS } from "@/entities/widget/model/operation";
import type { TimeSlotRule } from "@/entities/widget/model/operation";
import { parseTvSettings, timeSlotsForDevice } from "@/entities/widget/model/tv-settings";
import type { TvSettings } from "@/entities/widget/model/tv-settings";
import { queryKeys } from "@/shared/api/query-keys";
import { useRepositories } from "@/shared/api/repositories-context";

/**
 * 관리 화면에서 바꾼 TV 운영 설정(KV)을 1분마다 다시 받는다. 배포 없이 시간대 점유가
 * 바뀌고, 네트워크가 끊겨도 마지막으로 받은 설정으로 돈다.
 */
const CACHE_KEY = "flyerg:tv-settings";
const REFRESH_MS = 60_000;

function readCache(): TvSettings | null {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    return raw ? parseTvSettings(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

function writeCache(settings: TvSettings) {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(settings));
  } catch {
    // 저장소가 막혀도 이번 화면에서는 받은 설정으로 돈다.
  }
}

/** 이 TV에 걸리는 시간대 점유 규칙. 저장한 적이 없으면 코드의 기본 규칙(`TIME_SLOTS`) */
export function useTimeSlotRules(deviceId: string): readonly TimeSlotRule[] {
  const { widgets } = useRepositories();
  const [cached] = useState(readCache);
  const query = useQuery({
    queryKey: queryKeys.tvSettings.all(),
    queryFn: ({ signal }) => widgets.getTvSettings(signal),
    refetchInterval: REFRESH_MS,
    refetchIntervalInBackground: true,
    retry: 1,
  });

  useEffect(() => {
    if (query.data) writeCache(query.data);
  }, [query.data]);

  const timeSlots = (query.data ?? cached)?.timeSlots ?? null;
  return useMemo(
    () => timeSlotsForDevice(timeSlots ?? TIME_SLOTS, deviceId),
    [timeSlots, deviceId],
  );
}
