import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  TargetGroup,
  TargetGroupInput,
  UpdateTargetGroupInput,
} from "@/entities/device/model/types";
import { normalizeApiError } from "@/shared/api/error";
import type { ApiError } from "@/shared/api/error";
import { queryKeys } from "@/shared/api/query-keys";
import { useRepositories } from "@/shared/api/repositories-context";

/**
 * 위치 그룹 추가·수정·삭제 (`flyer-g-be` PR 16). SUPER_ADMIN만 한다.
 *
 * 성공하면 그룹 목록을 다시 받는다. 기기 목록과 신청 화면의 그룹 이름도 이 목록으로
 * 읽으므로 따로 무효화하지 않는다.
 */
function useRefreshTargetGroups() {
  const queryClient = useQueryClient();
  return () =>
    void queryClient.invalidateQueries({
      queryKey: queryKeys.reference.targetGroups(),
    });
}

async function run<T>(request: () => Promise<T>): Promise<T> {
  try {
    return await request();
  } catch (cause) {
    throw normalizeApiError(cause);
  }
}

export function useCreateTargetGroup() {
  const { reference } = useRepositories();
  const refresh = useRefreshTargetGroups();
  return useMutation<TargetGroup, ApiError, TargetGroupInput>({
    mutationFn: (input) => run(() => reference.createTargetGroup(input)),
    onSuccess: refresh,
  });
}

export function useUpdateTargetGroup() {
  const { reference } = useRepositories();
  const refresh = useRefreshTargetGroups();
  return useMutation<
    TargetGroup,
    ApiError,
    { id: string; input: UpdateTargetGroupInput }
  >({
    mutationFn: ({ id, input }) =>
      run(() => reference.updateTargetGroup(id, input)),
    onSuccess: refresh,
  });
}

export function useDeleteTargetGroup() {
  const { reference } = useRepositories();
  const refresh = useRefreshTargetGroups();
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => run(() => reference.deleteTargetGroup(id)),
    // 409(쓰는 곳이 있음)여도 다른 운영자가 바꿨을 수 있으니 목록은 늘 새로 받는다.
    onSettled: refresh,
  });
}
