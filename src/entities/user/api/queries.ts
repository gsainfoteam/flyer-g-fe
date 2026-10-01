import {
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
} from "@tanstack/react-query";
import { useRepositories } from "@/shared/api/repositories-context";
import { queryKeys } from "@/shared/api/query-keys";
import type { AdminUser, GrantableRole } from "../model/types";

/** 서버 최대값. 권한을 가진 사람은 많지 않아 보통 한 페이지로 끝난다. */
const HOLDERS_PAGE_SIZE = 100;
/** 그래도 끝없이 이어 받지 않는다. */
const HOLDERS_MAX_PAGES = 5;

export const USER_SEARCH_PAGE_SIZE = 20;

export interface RoleHolders {
  items: AdminUser[];
  /** 첫 페이지를 만든 서버 시각. "마지막 로그인 N일 전"을 센다. */
  serverTime: Date;
}

/**
 * 한 역할을 받은 사람 전부. 이름순이다.
 *
 * 받은 역할 그대로 거른다. REVIEWER로 물으면 두 역할을 다 가진 운영자도 온다.
 */
export function useRoleHolders(role: GrantableRole) {
  const { users } = useRepositories();

  return useQuery({
    queryKey: queryKeys.users.holders(role),
    queryFn: async ({ signal }): Promise<RoleHolders> => {
      const items: AdminUser[] = [];
      let serverTime: Date | null = null;
      let cursor: string | null = null;
      for (let page = 0; page < HOLDERS_MAX_PAGES; page += 1) {
        const result = await users.list(
          { role, cursor, limit: HOLDERS_PAGE_SIZE },
          signal,
        );
        items.push(...result.items);
        serverTime ??= result.serverTime;
        cursor = result.nextCursor;
        if (cursor === null) break;
      }
      return { items, serverTime: serverTime! };
    },
  });
}

/**
 * 이름·이메일·학번 검색. "더 보기"가 다음 cursor를 이어 붙인다.
 *
 * 검색어가 바뀌면 처음부터 다시 쌓는다. 그동안 앞 결과를 두어 목록이 깜빡이지 않게 한다.
 */
export function useUserSearch(q: string, { enabled = true } = {}) {
  const { users } = useRepositories();
  const params = { q, limit: USER_SEARCH_PAGE_SIZE };

  return useInfiniteQuery({
    queryKey: queryKeys.users.infinite(params),
    enabled,
    placeholderData: keepPreviousData,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) =>
      users.list({ ...params, cursor: pageParam }, signal),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}
