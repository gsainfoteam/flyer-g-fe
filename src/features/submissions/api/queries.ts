import {
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
} from "@tanstack/react-query";
import { toSubmissionView } from "@/entities/submission";
import type {
  SubmissionListParams,
  SubmissionStatus,
  SubmissionView,
} from "@/entities/submission/model/types";
import { useRepositories } from "@/shared/api/repositories-context";
import { queryKeys } from "@/shared/api/query-keys";

/**
 * 신청 목록·요약 조회.
 *
 * 요약은 서버가 목록과 같은 기준 시각으로 센 값이다. 화면은 건수를 직접 세지
 * 않고 이 값을 쓴다. (`API-REQUIREMENTS.md` 7.1)
 */
export function useSubmissionSummary(
  scope: SubmissionListParams["scope"] = "me",
  { enabled = true }: { enabled?: boolean } = {},
) {
  const { submissions } = useRepositories();

  return useQuery({
    queryKey: queryKeys.submissions.summary(scope),
    enabled,
    queryFn: ({ signal }) => submissions.getSummary({ scope }, signal),
  });
}

export function useSubmissionViews(
  params: SubmissionListParams = {},
  { keepPrevious = false }: { keepPrevious?: boolean } = {},
) {
  const { submissions } = useRepositories();

  return useQuery({
    queryKey: queryKeys.submissions.list(params),
    // 탭을 바꿀 때 목록이 비었다가 다시 차는 대신 앞 목록을 두고 바꾼다.
    placeholderData: keepPrevious ? keepPreviousData : undefined,
    queryFn: async ({ signal }) => {
      const page = await submissions.list(params, signal);
      return page;
    },
    select: (
      page,
    ): { items: SubmissionView[]; totalCount: number; serverTime: Date } => ({
      // 표시 상태는 저장된 값이 아니라 서버 시각 기준으로 기간까지 반영한 실제
      // 상태를 쓴다. 클라이언트 시계를 쓰지 않는다. (명세 6.3)
      items: page.items.map((item) => toSubmissionView(item, page.serverTime)),
      totalCount: page.totalCount,
      serverTime: page.serverTime,
    }),
  });
}

/** 목록 페이지의 기본 페이지 크기 */
export const SUBMISSION_PAGE_SIZE = 10;

/**
 * 상태 그룹 탭 기준의 무한 목록.
 *
 * "더 보기"가 이전 페이지를 유지한 채 다음 cursor를 이어 붙인다.
 * 필터가 바뀌면 query key가 바뀌어 처음부터 다시 쌓는다.
 */
export function useInfiniteSubmissionViews(
  statuses: readonly SubmissionStatus[],
  scope: SubmissionListParams["scope"] = "me",
) {
  const { submissions } = useRepositories();
  const params = { statuses, scope, limit: SUBMISSION_PAGE_SIZE };

  return useInfiniteQuery({
    queryKey: queryKeys.submissions.infinite(params),
    // 탭을 바꿔도 화면 전체가 로딩으로 바뀌지 않게 앞 목록을 둔다.
    placeholderData: keepPreviousData,
    queryFn: ({ pageParam, signal }) =>
      submissions.list({ ...params, cursor: pageParam }, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    select: (data) => {
      // 모든 페이지를 마지막 응답의 서버 시각으로 판정한다. 페이지마다 다른
      // 시각을 쓰면 같은 화면 안에서 상태가 어긋난다. (명세 6.3)
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
 * 신청 상세 하나.
 *
 * 표시 상태 판정에 서버 시각이 필요한데 단건 응답에는 없다. 상세는 화면이
 * 요약과 함께 열리므로, 판정은 호출부가 요약·목록의 서버 시각으로 한다.
 *
 * id가 없으면 조회하지 않는다. 새 신청 작성처럼 편집 대상이 없는 화면에서
 * 빈 id로 `GET /submissions/`를 보내지 않기 위해서다.
 */
export function useSubmissionDetail(submissionId: string | null | undefined) {
  const { submissions } = useRepositories();

  return useQuery({
    queryKey: queryKeys.submissions.detail(submissionId ?? ""),
    enabled: Boolean(submissionId),
    queryFn: ({ signal }) => submissions.getById(submissionId!, signal),
  });
}

/** 신청 하나의 검토 이력. 상세 타임라인에 쓴다. */
export function useReviewHistory(submissionId: string) {
  const { reviews } = useRepositories();

  return useQuery({
    queryKey: queryKeys.reviews.history(submissionId),
    queryFn: ({ signal }) => reviews.listHistory(submissionId, signal),
  });
}
