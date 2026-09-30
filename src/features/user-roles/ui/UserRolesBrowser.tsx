import { useEffect, useId, useState } from "react";
import type { ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  USER_SEARCH_PAGE_SIZE,
  useRoleHolders,
  useUserSearch,
} from "@/entities/user/api/queries";
import { USER_QUERY_MAX_LENGTH } from "@/entities/user";
import { isApiError, toUserMessage } from "@/shared/api/error";
import { queryKeys } from "@/shared/api/query-keys";
import { EmptyState, PageState, Panel } from "@/shared/components";
import { useDebouncedValue } from "@/shared/lib/use-debounced-value";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Spinner } from "@/shared/ui/spinner";
import { UserRoleTable } from "./UserRoleTable";

/** 입력을 멈추고 이만큼 지나면 찾는다. */
const SEARCH_DEBOUNCE_MS = 300;

/**
 * 사용자 권한 화면의 본문. 제목 옆 검색 칸과 사용자 표 하나.
 *
 * 검색어가 없으면 지금 권한을 가진 사람을 보여 주고, 입력하면 전체 사용자에서 찾는다.
 * 같은 이름이 여럿일 수 있어 이메일과 학번을 함께 보여 준다.
 */
export function UserRolesBrowser({ currentUserId }: { currentUserId: string }) {
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const [input, setInput] = useState("");
  const q = useDebouncedValue(input.trim(), SEARCH_DEBOUNCE_MS);
  const search = useUserSearch(q, { enabled: q !== "" });

  // 검색어 오류(422 `fields.q`)는 표 대신 입력 칸 아래에 보인다.
  const queryError =
    q !== "" && isApiError(search.error) ? search.error.fields?.q : undefined;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-heading text-ink">사용자 권한</h1>
          <p className="mt-1 text-label text-ink-muted">
            하우스 관리자·시스템 운영자 지정
          </p>
        </div>
        <div className="flex w-full flex-col gap-1.5 sm:w-72">
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
      </div>

      {q === "" ? (
        <RoleHolders currentUserId={currentUserId} />
      ) : (
        !queryError && (
          <SearchResults q={q} search={search} currentUserId={currentUserId} />
        )
      )}
    </div>
  );
}

/**
 * 지금 권한을 가진 사람. 시스템 운영자, 하우스 관리자 순이고 각각 이름순이다.
 *
 * 서버는 받은 역할 그대로 거른다. 두 역할을 다 가진 운영자는 REVIEWER 목록에도 오므로
 * 한 번만 넣는다.
 */
function RoleHolders({ currentUserId }: { currentUserId: string }) {
  const operators = useRoleHolders("SUPER_ADMIN");
  const reviewers = useRoleHolders("REVIEWER");
  const failed = operators.error ?? reviewers.error;

  const users =
    operators.data && reviewers.data
      ? [
          ...operators.data.items,
          ...reviewers.data.items.filter(
            (user) => !user.grantedRoles.includes("SUPER_ADMIN"),
          ),
        ]
      : null;

  return (
    <UserTableFrame
      summary={users && `권한 있는 사용자 ${users.length}명`}
      isLoading={!failed && users === null}
      error={failed}
      onRetry={() => {
        if (operators.error) void operators.refetch();
        if (reviewers.error) void reviewers.refetch();
      }}
    >
      {users && operators.data && (
        <UserRoleTable
          users={users}
          currentUserId={currentUserId}
          serverNow={operators.data.serverTime}
        />
      )}
    </UserTableFrame>
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
    <UserTableFrame
      summary={firstPage && `검색 결과 ${firstPage.totalCount}명`}
      isLoading={search.isPending}
      error={search.data ? null : search.error}
      onRetry={() => void search.refetch()}
      busy={search.isFetching}
      footer={
        firstPage &&
        (search.hasNextPage || nextPageError) && (
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
        )
      }
    >
      {firstPage &&
        (items.length === 0 ? (
          <EmptyState
            title="찾는 사용자가 없어요"
            description="한 번이라도 로그인한 사용자만 찾을 수 있어요. 이름·이메일·학번의 일부로도 찾을 수 있어요."
            className="px-5"
          />
        ) : (
          <UserRoleTable
            users={items}
            currentUserId={currentUserId}
            serverNow={firstPage.serverTime}
          />
        ))}
    </UserTableFrame>
  );
}

/** 표 위의 건수 한 줄과 표를 담는 면. 로딩·오류는 면 안에서 보인다. */
function UserTableFrame({
  summary,
  isLoading,
  error,
  onRetry,
  busy = false,
  footer,
  children,
}: {
  summary: string | null | undefined;
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
  busy?: boolean;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2.5" aria-busy={busy}>
      <p className="min-h-5 text-label text-ink-muted" aria-live="polite">
        {summary}
      </p>
      <Panel flush bodyClassName="p-0">
        {/* 표는 가장자리까지 쓰고, 로딩·오류 안내만 안쪽 여백을 둔다. */}
        <div className={isLoading || error ? "px-5" : undefined}>
          <PageState
            isLoading={isLoading}
            error={error}
            onRetry={onRetry}
            loadingRows={3}
          >
            {children}
          </PageState>
        </div>
        {footer}
      </Panel>
    </section>
  );
}
