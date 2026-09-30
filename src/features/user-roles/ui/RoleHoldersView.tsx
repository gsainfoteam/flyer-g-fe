import { useRoleHolders } from "@/entities/user/api/queries";
import type { AdminUser } from "@/entities/user";
import {
  EmptyState,
  PageState,
  Panel,
  SectionHeader,
} from "@/shared/components";
import { UserRoleRow } from "./UserRoleRow";

/**
 * 검색어가 없을 때 보이는 권한자 목록. 지금 누가 무엇을 맡고 있는지 먼저 보여 준다.
 *
 * 서버는 받은 역할 그대로 거른다. 두 역할을 다 가진 운영자는 REVIEWER 목록에도 오므로
 * 하우스 관리자 칸에서는 뺀다. 운영자는 검토 권한을 포함한다.
 */
export function RoleHoldersView({ currentUserId }: { currentUserId: string }) {
  const operators = useRoleHolders("SUPER_ADMIN");
  const reviewers = useRoleHolders("REVIEWER");

  return (
    <>
      <HolderSection
        title="시스템 운영자"
        description="기기·위치 그룹·사용자 권한까지 전체 관리"
        query={operators}
        users={operators.data?.items}
        currentUserId={currentUserId}
        emptyTitle="시스템 운영자가 없어요"
      />
      <HolderSection
        title="하우스 관리자"
        description="포스터 승인·반려·게시 중단"
        query={reviewers}
        users={reviewers.data?.items.filter(
          (user) => !user.grantedRoles.includes("SUPER_ADMIN"),
        )}
        currentUserId={currentUserId}
        emptyTitle="하우스 관리자가 없어요"
      />
    </>
  );
}

function HolderSection({
  title,
  description,
  query,
  users,
  currentUserId,
  emptyTitle,
}: {
  title: string;
  description: string;
  query: ReturnType<typeof useRoleHolders>;
  users: AdminUser[] | undefined;
  currentUserId: string;
  emptyTitle: string;
}) {
  return (
    <section className="flex flex-col gap-4">
      <SectionHeader
        title={users ? `${title} ${users.length}명` : title}
        description={description}
      />
      <Panel flush>
        <PageState
          isLoading={query.isPending}
          error={query.error}
          onRetry={() => void query.refetch()}
          loadingRows={2}
        >
          {users && query.data && users.length === 0 && (
            <EmptyState
              title={emptyTitle}
              description="위에서 사용자를 찾아 역할을 바꿀 수 있어요."
              className="px-5"
            />
          )}
          {users && query.data && users.length > 0 && (
            <ul className="flex flex-col divide-y divide-line">
              {users.map((user) => (
                <UserRoleRow
                  key={user.id}
                  user={user}
                  isSelf={user.id === currentUserId}
                  serverNow={query.data.serverTime}
                />
              ))}
            </ul>
          )}
        </PageState>
      </Panel>
    </section>
  );
}
