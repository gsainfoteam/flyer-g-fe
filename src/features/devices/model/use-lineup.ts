import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { LineupInput } from "@/entities/lineup/model/types";
import { useRepositories } from "@/shared/api/repositories-context";
import { queryKeys } from "@/shared/api/query-keys";

export function useLineup(groupId: string) {
  const { lineups } = useRepositories();
  return useQuery({
    queryKey: queryKeys.lineups.detail(groupId),
    queryFn: ({ signal }) => lineups.get(groupId, signal),
    retry: false,
  });
}
export function useLineupPrograms() {
  const { lineups } = useRepositories();
  return useQuery({
    queryKey: queryKeys.lineups.programs(),
    queryFn: ({ signal }) => lineups.listPrograms(signal),
    retry: false,
  });
}
export function useLineupPreview(deviceId: string | undefined) {
  const { lineups } = useRepositories();
  return useQuery({
    queryKey: ["lineup-preview", deviceId],
    queryFn: ({ signal }) => lineups.preview(deviceId!, signal),
    enabled: !!deviceId,
    retry: false,
  });
}
export function useSaveLineup(groupId: string) {
  const { lineups } = useRepositories();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: LineupInput) => lineups.save(groupId, input),
    onSuccess: (saved) => {
      client.setQueryData(queryKeys.lineups.detail(groupId), saved);
      void client.invalidateQueries({ queryKey: queryKeys.devices.all() });
      void client.invalidateQueries({ queryKey: queryKeys.displays.all() });
    },
  });
}
