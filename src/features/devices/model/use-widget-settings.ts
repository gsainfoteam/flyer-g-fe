import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TimeSlotRule } from "@/entities/widget/model/operation";
import type { DeviceWidgetSettingsDto } from "@/entities/widget/model/settings";
import { normalizeApiError } from "@/shared/api/error";
import { queryKeys } from "@/shared/api/query-keys";
import { useRepositories } from "@/shared/api/repositories-context";

/** 기기 위젯 설정 (같은 도메인 함수, Cloudflare KV). SUPER_ADMIN만 저장한다. */
export function useWidgetSettings(deviceId: string) {
  const { widgets } = useRepositories();
  return useQuery({
    queryKey: queryKeys.widgetSettings.detail(deviceId),
    queryFn: ({ signal }) => widgets.getSettings(deviceId, signal),
    retry: 1,
  });
}

export function useSaveWidgetSettings(deviceId: string) {
  const { widgets } = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (settings: DeviceWidgetSettingsDto) => {
      try {
        return await widgets.saveSettings(deviceId, settings);
      } catch (cause) {
        throw normalizeApiError(cause);
      }
    },
    onSuccess: (saved) => {
      queryClient.setQueryData(queryKeys.widgetSettings.detail(deviceId), saved);
      // 같은 브라우저에서 연 TV 미리보기가 바로 반영되게 한다.
      void queryClient.invalidateQueries({ queryKey: queryKeys.displays.widgets(deviceId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.tvSettings.all() });
    },
  });
}

/** TV 운영 설정 전체(시간대 점유 포함). TV와 같은 키를 써 같은 브라우저의 미리보기에 바로 닿는다. */
export function useTvSettings() {
  const { widgets } = useRepositories();
  return useQuery({
    queryKey: queryKeys.tvSettings.all(),
    queryFn: ({ signal }) => widgets.getTvSettings(signal),
  });
}

export function useSaveTimeSlots() {
  const { widgets } = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (rules: readonly TimeSlotRule[]) => {
      try {
        return await widgets.saveTimeSlots(rules);
      } catch (cause) {
        throw normalizeApiError(cause);
      }
    },
    onSuccess: (saved) => {
      queryClient.setQueryData(queryKeys.tvSettings.all(), saved);
    },
  });
}
