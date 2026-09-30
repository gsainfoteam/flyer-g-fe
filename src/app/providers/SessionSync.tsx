import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useAuth } from "@/features/auth/model/auth-context";
import { normalizeApiError } from "@/shared/api/error";

/**
 * 세션과 서버 상태 캐시를 맞춘다.
 *
 * - 사용자가 바뀌면(로그아웃, 역할 전환) 이전 사용자의 응답을 버린다. 캐시 key에
 *   사용자가 없어서, 남겨 두면 다음 사용자에게 staleTime 동안 남의 목록이 보인다.
 * - 어떤 요청이든 401이 오면 세션이 끝난 것이다. 로그인 화면으로 보낸다.
 * - 403이 오면 다른 운영자가 내 역할을 바꿨을 수 있다. 세션을 다시 불러와 메뉴와 화면
 *   권한을 맞춘다. 권한이 사라졌으면 route guard가 권한 없음 화면으로 바꾼다.
 */
export function SessionSync() {
  const { state, expireSession, reloadSession } = useAuth();
  const queryClient = useQueryClient();
  const userId = state.status === "authenticated" ? state.user.id : null;
  const previousUserId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const previous = previousUserId.current;
    previousUserId.current = userId;
    // 처음 세션을 복원한 순간은 바뀐 것이 아니다.
    if (previous === undefined || previous === userId) return;

    void queryClient.cancelQueries();
    if (userId === null) {
      queryClient.clear();
    } else {
      // 화면에 남아 있는 조회는 새 사용자로 다시 부른다.
      void queryClient.resetQueries();
    }
  }, [queryClient, userId]);

  useEffect(() => {
    if (userId === null) return;

    const handleError = (error: unknown) => {
      const { code } = normalizeApiError(error);
      if (code === "UNAUTHENTICATED") expireSession();
      else if (code === "FORBIDDEN") void reloadSession();
    };

    const unsubscribeQueries = queryClient
      .getQueryCache()
      .subscribe((event) => {
        if (event.type === "updated" && event.action.type === "error") {
          handleError(event.action.error);
        }
      });
    const unsubscribeMutations = queryClient
      .getMutationCache()
      .subscribe((event) => {
        if (event.type === "updated" && event.action.type === "error") {
          handleError(event.action.error);
        }
      });

    return () => {
      unsubscribeQueries();
      unsubscribeMutations();
    };
  }, [queryClient, userId, expireSession, reloadSession]);

  return null;
}
