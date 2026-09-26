import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toSubmissionView } from "@/entities/submission";
import type { SubmissionView } from "@/entities/submission/model/types";
import { useRepositories } from "@/app/providers/repositories-context";
import { queryKeys } from "@/shared/api/query-keys";

/**
 * 승인 대기 목록 조회. 대시보드처럼 앞의 몇 건만 필요할 때 쓴다.
 * 오래 기다린 순(마지막으로 낸 시각 기준)으로 온다.
 */
export function usePendingReviews(
  limit = 5,
  { enabled = true }: { enabled?: boolean } = {},
) {
  const { reviews } = useRepositories();

  return useQuery({
    queryKey: queryKeys.reviews.pending({ limit }),
    // 검토 권한이 없는 세션에서는 부르지 않는다. 서버는 403을 준다.
    enabled,
    queryFn: ({ signal }) => reviews.listPending({ limit }, signal),
    select: (
      page,
    ): { items: SubmissionView[]; totalCount: number; serverTime: Date } => ({
      items: page.items.map((item) => toSubmissionView(item, page.serverTime)),
      totalCount: page.totalCount,
      serverTime: page.serverTime,
    }),
  });
}

/** 승인 대기 목록 화면의 한 페이지 크기 */
export const PENDING_PAGE_SIZE = 20;

/** 승인 대기 전체 목록. "더 보기"로 이어 붙인다. */
export function useInfinitePendingReviews() {
  const { reviews } = useRepositories();

  return useInfiniteQuery({
    queryKey: queryKeys.reviews.pendingInfinite(PENDING_PAGE_SIZE),
    queryFn: ({ pageParam, signal }) =>
      reviews.listPending(
        { limit: PENDING_PAGE_SIZE, cursor: pageParam },
        signal,
      ),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    select: (data) => {
      // 모든 페이지를 마지막 응답의 서버 시각으로 판정한다. (명세 6.3)
      const serverTime = data.pages.at(-1)?.serverTime ?? new Date(0);
      return {
        items: data.pages.flatMap((page) =>
          page.items.map((item) => toSubmissionView(item, serverTime)),
        ),
        totalCount: data.pages.at(-1)?.totalCount ?? 0,
        serverTime,
      };
    },
  });
}

/**
 * 결정을 마친 뒤 이어서 볼 다음 승인 대기 건. 없으면 null.
 * 방금 결정한 건이 아직 목록에 남아 있을 수 있어 제외하고 고른다.
 */
export function useNextPendingReview() {
  const { reviews } = useRepositories();
  const queryClient = useQueryClient();

  return async (excludeId: string): Promise<string | null> => {
    const page = await queryClient.fetchQuery({
      queryKey: queryKeys.reviews.pending({ limit: 2 }),
      queryFn: ({ signal }) => reviews.listPending({ limit: 2 }, signal),
      staleTime: 0,
    });
    return page.items.find((item) => item.id !== excludeId)?.id ?? null;
  };
}
