import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { DeviceWidgetSettingsDto } from "@/entities/widget/model/settings";
import { normalizeApiError } from "@/shared/api/error";
import { queryKeys } from "@/shared/api/query-keys";
import { useRepositories } from "@/shared/api/repositories-context";

/** 기기 위젯 설정 (위젯 API, flyer-g-be#24 제안). SUPER_ADMIN만 한다. */
export function useWidgetSettings(deviceId: string) {
  const { widgets } = useRepositories();
  return useQuery({
    queryKey: queryKeys.widgetSettings.detail(deviceId),
    queryFn: ({ signal }) => widgets.getSettings(deviceId, signal),
    // 서버가 지원하지 않으면(404) 다시 물어도 같다.
    retry: false,
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
    },
  });
}
