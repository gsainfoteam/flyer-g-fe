import { useQuery } from "@tanstack/react-query";
import { useAppServices } from "@/app/providers/services-context";
import type { ZiggleNotice } from "@/entities/notice";
import type { ApiError } from "@/shared/api/error";
import { queryKeys } from "@/shared/api/query-keys";

/**
 * Ziggle 공지 조회.
 *
 * 공지는 신청 폼의 자동 채움 원천이라 신청 목록보다 훨씬 덜 변한다.
 * 재조회를 자주 하지 않는다.
 */
const NOTICE_STALE_TIME_MS = 5 * 60 * 1000;

export function useZiggleNotice(noticeId: string | null) {
  const { notices } = useAppServices();

  // repository와 adapter는 실패를 ApiError 하나로 좁힌다. 화면이 오류를 구분할 수
  // 있도록 그 타입을 그대로 노출한다.
  return useQuery<ZiggleNotice, ApiError>({
    queryKey: queryKeys.notices.detail(noticeId ?? ""),
    queryFn: ({ signal }) => notices.getById(noticeId!, signal),
    enabled: noticeId !== null && noticeId.length > 0,
    staleTime: NOTICE_STALE_TIME_MS,
    // 없는 공지·권한 없는 공지는 다시 시도해도 결과가 같다.
    retry: false,
  });
}

export function useSubmittableNotices() {
  const { notices } = useAppServices();

  return useQuery({
    queryKey: queryKeys.notices.submittable(),
    queryFn: ({ signal }) => notices.listSubmittable(signal),
    staleTime: NOTICE_STALE_TIME_MS,
  });
}
