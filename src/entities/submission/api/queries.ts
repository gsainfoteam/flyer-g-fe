import { useQuery } from "@tanstack/react-query";
import { useRepositories } from "@/shared/api/repositories-context";
import { queryKeys } from "@/shared/api/query-keys";

/** 운영 중에는 거의 바뀌지 않는다. 화면을 오가며 다시 받지 않는다. */
const REFERENCE_STALE_MS = 10 * 60_000;

/**
 * 게시 운영 제한값 (`GET /signage/config`). 신청 폼이 서버와 같은 규칙으로 미리 막는다.
 * 값을 프론트 상수로 두지 않는다 — 서버 정책이 바뀌면 두 곳이 어긋난다.
 */
export function useSignageConfig() {
  const { reference } = useRepositories();

  return useQuery({
    queryKey: queryKeys.reference.config(),
    queryFn: ({ signal }) => reference.getConfig(signal),
    staleTime: REFERENCE_STALE_MS,
  });
}

/** 게시 카테고리 (`GET /signage/categories`). 숨긴 카테고리는 오지 않는다. */
export function useCategories() {
  const { reference } = useRepositories();

  return useQuery({
    queryKey: queryKeys.reference.categories(),
    queryFn: ({ signal }) => reference.listCategories(signal),
    staleTime: REFERENCE_STALE_MS,
  });
}
