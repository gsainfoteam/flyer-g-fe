import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  NO_WIDGETS,
  toDeviceWidgets,
  toDeviceWidgetsDto,
} from "@/entities/widget/model/feed";
import type { DeviceWidgets, DeviceWidgetsDto } from "@/entities/widget/model/feed";
import { queryKeys } from "@/shared/api/query-keys";
import { useRepositories } from "@/shared/api/repositories-context";

/**
 * TV가 받는 위젯과 상단 바 날씨. 편성과 따로 받는다.
 *
 * 편성처럼 주기적으로 다시 받고, 마지막으로 받은 것을 기기에 남겨 둔다. 네트워크가
 * 끊겨도 위젯과 날씨가 계속 돈다. 날씨·학식처럼 오래되면 안 되는 내용은 화면이 날짜와
 * 받은 시각으로 다시 걸러 낸다.
 */
const CACHE_PREFIX = "flyerg:widgets:";

function readCache(deviceId: string): DeviceWidgets | null {
  try {
    const raw = window.localStorage.getItem(CACHE_PREFIX + deviceId);
    return raw ? toDeviceWidgets(JSON.parse(raw) as DeviceWidgetsDto) : null;
  } catch {
    return null;
  }
}

function writeCache(deviceId: string, feed: DeviceWidgets) {
  try {
    window.localStorage.setItem(CACHE_PREFIX + deviceId, JSON.stringify(toDeviceWidgetsDto(feed)));
  } catch {
    // 저장소가 막혀도 이번 화면에서는 받은 위젯으로 돈다.
  }
}

export function useDeviceWidgets(deviceId: string, refreshSeconds: number): DeviceWidgets {
  const { widgets } = useRepositories();
  const [cached] = useState(() => readCache(deviceId));
  const query = useQuery({
    queryKey: queryKeys.displays.widgets(deviceId),
    queryFn: ({ signal }) => widgets.getDeviceWidgets(deviceId, signal),
    refetchInterval: refreshSeconds * 1000,
    refetchIntervalInBackground: true,
    // 받지 못해도 위젯은 부가 기능이다. 캐시로 버티고 다음 주기에 다시 받는다.
    retry: 1,
  });

  useEffect(() => {
    if (query.data) writeCache(deviceId, query.data);
  }, [deviceId, query.data]);

  return query.data ?? cached ?? NO_WIDGETS;
}
