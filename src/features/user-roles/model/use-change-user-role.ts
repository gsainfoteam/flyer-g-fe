import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import { planRoleChange } from "@/entities/user";
import type { AdminUser, Role } from "@/entities/user";
import type { Page } from "@/entities/submission/model/types";
import { normalizeApiError } from "@/shared/api/error";
import type { ApiError } from "@/shared/api/error";
import { queryKeys } from "@/shared/api/query-keys";
import { useRepositories } from "@/shared/api/repositories-context";

export interface ChangeUserRoleInput {
  user: AdminUser;
  /** 고른 역할 하나. 가진 역할 중 가장 높은 것이 이것이 되게 한다. */
  target: Role;
}

/**
 * 역할 하나를 골라 바꾼다. 필요한 부여·회수를 순서대로 보낸다(`planRoleChange`).
 *
 * 부여 응답이 가장 믿을 만한 현재 상태라 그것을 이어 쓰고, 회수(204)는 로컬에서 뺀다.
 * 성공하면 화면의 그 사람 행을 바로 바꾸고, 성공이든 실패든 목록을 다시 받는다 —
 * 두 번째 요청이 실패하면 첫 요청만 반영된 상태라 서버 값을 다시 봐야 한다.
 */
export function useChangeUserRole() {
  const { users } = useRepositories();
  const queryClient = useQueryClient();

  return useMutation<AdminUser, ApiError, ChangeUserRoleInput>({
    mutationFn: async ({ user, target }) => {
      let current = user;
      try {
        for (const step of planRoleChange(user.grantedRoles, target)) {
          if (step.type === "grant") {
            current = await users.grantRole(user.id, step.role);
          } else {
            await users.revokeRole(user.id, step.role);
            current = {
              ...current,
              grantedRoles: current.grantedRoles.filter(
                (role) => role !== step.role,
              ),
            };
          }
        }
      } catch (cause) {
        throw normalizeApiError(cause);
      }
      return current;
    },
    onSuccess: (updated) => replaceUserInCache(queryClient, updated),
    onSettled: () =>
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.all() }),
  });
}

/** 권한자 목록과 검색 결과에서 그 사람 행만 바꿔 끼운다. */
function replaceUserInCache(queryClient: QueryClient, updated: AdminUser) {
  const replace = (user: AdminUser) =>
    user.id === updated.id ? updated : user;

  queryClient.setQueriesData<{ items: AdminUser[]; serverTime: Date }>(
    { queryKey: [...queryKeys.users.all(), "holders"] },
    (data) => data && { ...data, items: data.items.map(replace) },
  );
  queryClient.setQueriesData<InfiniteData<Page<AdminUser>>>(
    { queryKey: [...queryKeys.users.all(), "infinite"] },
    (data) =>
      data && {
        ...data,
        pages: data.pages.map((page) => ({
          ...page,
          items: page.items.map(replace),
        })),
      },
  );
}
