import { useQuery } from "@tanstack/react-query";
import { toSubmissionView } from "@/entities/submission";
import type {
  SubmissionListParams,
  SubmissionView,
} from "@/entities/submission/model/types";
import { useRepositories } from "@/app/providers/repositories-context";
import { queryKeys } from "@/shared/api/query-keys";

/**
 * 신청 목록·요약 조회.
 *
 * 필터, pagination, 캐시 무효화 규칙은 Phase 03에서 확장한다.
 * 여기서는 화면이 fixture 대신 repository를 통해 읽게 하는 최소 경계만 만든다.
 */
export function useSubmissionSummary(scope: SubmissionListParams["scope"] = "me") {
  const { submissions } = useRepositories();

  return useQuery({
    queryKey: queryKeys.submissions.summary(scope),
    queryFn: ({ signal }) => submissions.getSummary({ scope }, signal),
  });
}

export function useSubmissionViews(params: SubmissionListParams = {}) {
  const { submissions } = useRepositories();

  return useQuery({
    queryKey: queryKeys.submissions.list(params),
    queryFn: async ({ signal }) => {
      const page = await submissions.list(params, signal);
      return page;
    },
    select: (page): { items: SubmissionView[]; totalCount: number } => ({
      // 표시 상태는 저장된 값이 아니라 기간까지 반영한 실제 상태를 쓴다.
      items: page.items.map((item) => toSubmissionView(item, new Date())),
      totalCount: page.totalCount,
    }),
  });
}
