import { useEffect, useId, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  USER_SEARCH_PAGE_SIZE,
  useUserSearch,
} from "@/entities/user/api/queries";
import { USER_QUERY_MAX_LENGTH } from "@/entities/user";
import { isApiError, toUserMessage } from "@/shared/api/error";
import { queryKeys } from "@/shared/api/query-keys";
import {
  EmptyState,
  PageState,
  Panel,
  SectionHeader,
} from "@/shared/components";
import { useDebouncedValue } from "@/shared/lib/use-debounced-value";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Spinner } from "@/shared/ui/spinner";
import { RoleHoldersView } from "./RoleHoldersView";
import { UserRoleRow } from "./UserRoleRow";

/** 입력을 멈추고 이만큼 지나면 찾는다. */
const SEARCH_DEBOUNCE_MS = 300;

/**
 * 사용자 검색과 역할 변경.
 *
 * 검색어가 없으면 지금 권한을 가진 사람을 보여 주고, 입력하면 전체 사용자에서 찾는다.
 * 같은 이름이 여럿일 수 있어 행마다 이메일과 학번을 함께 보여 준다.
 */
export function UserRolesBrowser({ currentUserId }: { currentUserId: string }) {
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const [input, setInput] = useState("");
  const q = useDebouncedValue(input.trim(), SEARCH_DEBOUNCE_MS);
  const search = useUserSearch(q, { enabled: q !== "" });

  // 검색어 오류(422 `fields.q`)는 목록 대신 입력 칸 아래에 보인다.
  const queryError =
    q !== "" && isApiError(search.error) ? search.error.fields?.q : undefined;

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={inputId} className="sr-only">
          사용자 검색
        </Label>
        <Input
          id={inputId}
          type="search"
          value={input}
          maxLength={USER_QUERY_MAX_LENGTH}
          placeholder="이름·이메일·학번으로 찾기"
          autoComplete="off"
          aria-invalid={Boolean(queryError)}
          aria-describedby={queryError ? errorId : undefined}
          className="h-10 border-line-strong bg-surface px-3 text-label md:text-label"
          onChange={(event) => setInput(event.target.value)}
        />
        {queryError && (
          <p id={errorId} className="text-caption text-danger">
            {queryError}
          </p>
        )}
      </div>

      {q === "" ? (
        <RoleHoldersView currentUserId={currentUserId} />
      ) : (
        !queryError && (
          <SearchResults q={q} search={search} currentUserId={currentUserId} />
        )
      )}
    </>
  );
}

function SearchResults({
  q,
  search,
  currentUserId,
}: {
  q: string;
  search: ReturnType<typeof useUserSearch>;
  currentUserId: string;
}) {
  const queryClient = useQueryClient();
  const items = search.data?.pages.flatMap((page) => page.items) ?? [];
  const firstPage = search.data?.pages[0];
  const nextPageError =
    search.data && search.isFetchNextPageError ? search.error : null;

  // cursor가 틀렸다(400)면 이어 받을 수 없다. 첫 페이지부터 다시 받는다.
  useEffect(() => {
    if (isApiError(nextPageError) && nextPageError.code === "INVALID_REQUEST") {
      void queryClient.resetQueries({
        queryKey: queryKeys.users.infinite({ q, limit: USER_SEARCH_PAGE_SIZE }),
      });
    }
  }, [nextPageError, queryClient, q]);

  return (
    <section className="flex flex-col gap-4" aria-busy={search.isFetching}>
      <SectionHeader
        title={firstPage ? `검색 결과 ${firstPage.totalCount}명` : "검색 결과"}
      />
      <Panel flush>
        <PageState
          isLoading={search.isPending}
          error={search.data ? null : search.error}
          onRetry={() => void search.refetch()}
          loadingRows={3}
        >
          {firstPage && items.length === 0 && (
            <EmptyState
              title="찾는 사용자가 없어요"
              description="한 번이라도 로그인한 사용자만 찾을 수 있어요. 이름·이메일·학번의 일부로도 찾을 수 있어요."
              className="px-5"
            />
          )}
          {firstPage && items.length > 0 && (
            <ul className="flex flex-col divide-y divide-line">
              {items.map((user) => (
                <UserRoleRow
                  key={user.id}
                  user={user}
                  isSelf={user.id === currentUserId}
                  serverNow={firstPage.serverTime}
                />
              ))}
            </ul>
          )}
        </PageState>

        {firstPage && (search.hasNextPage || nextPageError) && (
          <div className="flex flex-col gap-2 border-t border-line p-3">
            {nextPageError && (
              <p role="alert" className="text-caption text-danger">
                다음 목록을 불러오지 못했어요.{" "}
                {isApiError(nextPageError) && toUserMessage(nextPageError)}
              </p>
            )}
            <Button
              variant="secondary"
              size="sm"
              className="w-full"
              disabled={search.isFetchingNextPage}
              onClick={() => void search.fetchNextPage()}
            >
              {search.isFetchingNextPage && <Spinner aria-hidden="true" />}더
              보기 ({items.length} / {firstPage.totalCount})
            </Button>
          </div>
        )}
      </Panel>
    </section>
  );
}
