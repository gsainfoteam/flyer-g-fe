import { useQuery } from "@tanstack/react-query";
import { useRepositories } from "@/shared/api/repositories-context";
import { describeTargetGroups } from "@/entities/device/model/types";
import { queryKeys } from "@/shared/api/query-keys";

/** 기기가 heartbeat를 보내는 주기에 맞춰 연결 상태를 다시 본다. */
const DEVICE_REFRESH_MS = 30_000;

/**
 * 기기 목록과 연결 상태. 하우스 관리자 이상만 조회할 수 있다.
 * 게시자 세션에서는 `enabled: false`로 부르지 않는다.
 */
export function useDevices({ enabled = true }: { enabled?: boolean } = {}) {
  const { devices } = useRepositories();

  return useQuery({
    queryKey: queryKeys.devices.list(),
    queryFn: ({ signal }) => devices.list(signal),
    enabled,
    refetchInterval: DEVICE_REFRESH_MS,
  });
}

/** 게시 대상 위치 묶음. 자주 바뀌지 않는 참조 데이터다. */
export function useTargetGroups() {
  const { devices } = useRepositories();

  return useQuery({
    queryKey: queryKeys.devices.targetGroups(),
    queryFn: ({ signal }) => devices.listTargetGroups(signal),
    staleTime: 10 * 60_000,
  });
}

/**
 * 신청의 대상 위치를 한 줄로. 그룹 목록을 받기 전에는 null이다.
 * 받기 전에 "모든 위치"라고 먼저 보여주면 틀린 값이 잠깐 스친다.
 */
export function useTargetGroupLabel(groupIds: readonly string[]): string | null {
  const groups = useTargetGroups();
  if (!groups.data) return null;
  return describeTargetGroups(groupIds, groups.data);
}
