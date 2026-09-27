import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  DeviceInput,
  DeviceWithToken,
  DisplayDevice,
  UpdateDeviceInput,
} from "@/entities/device/model/types";
import { normalizeApiError } from "@/shared/api/error";
import type { ApiError } from "@/shared/api/error";
import { queryKeys } from "@/shared/api/query-keys";
import { useRepositories } from "@/shared/api/repositories-context";

/**
 * 기기 등록·수정·토큰 재발급 (`API-CHANGES-BACKEND.md` 11.1). SUPER_ADMIN만 한다.
 *
 * 성공하면 기기 목록(대시보드 패널 포함)을 다시 받는다. 등록·재발급 응답의 토큰은
 * 캐시에 두지 않고 호출부가 바로 설정 링크로 보여준 뒤 버린다.
 */
function useRefreshDevices() {
  const queryClient = useQueryClient();
  return () =>
    void queryClient.invalidateQueries({ queryKey: queryKeys.devices.all() });
}

async function run<T>(request: () => Promise<T>): Promise<T> {
  try {
    return await request();
  } catch (cause) {
    throw normalizeApiError(cause);
  }
}

export function useCreateDevice() {
  const { devices } = useRepositories();
  const refresh = useRefreshDevices();
  return useMutation<DeviceWithToken, ApiError, DeviceInput>({
    mutationFn: (input) => run(() => devices.create(input)),
    onSuccess: refresh,
  });
}

export function useUpdateDevice(deviceId: string) {
  const { devices } = useRepositories();
  const refresh = useRefreshDevices();
  return useMutation<DisplayDevice, ApiError, UpdateDeviceInput>({
    mutationFn: (input) => run(() => devices.update(deviceId, input)),
    onSuccess: refresh,
  });
}

export function useRotateDeviceToken() {
  const { devices } = useRepositories();
  const refresh = useRefreshDevices();
  return useMutation<DeviceWithToken, ApiError, string>({
    mutationFn: (deviceId) => run(() => devices.rotateToken(deviceId)),
    onSuccess: refresh,
  });
}
