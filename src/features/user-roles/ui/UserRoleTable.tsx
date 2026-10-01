import type { AdminUser } from "@/entities/user";
import { UserRoleRow } from "./UserRoleRow";

/**
 * 사용자와 역할 표. 한 사람이 한 줄이다.
 *
 * 좁은 화면에서는 이메일을 이름 아래로 내리고 학번·마지막 로그인 칸을 뺀다. 가로
 * 스크롤 없이 이름과 역할이 늘 보이게.
 */
interface UserRoleTableProps {
  users: readonly AdminUser[];
  currentUserId: string;
  /** 목록을 만든 서버 시각. 마지막 로그인을 센다. */
  serverNow: Date;
}

export function UserRoleTable({
  users,
  currentUserId,
  serverNow,
}: UserRoleTableProps) {
  const head = "px-4 py-2.5 font-medium first:pl-5 last:pr-5";

  return (
    <table className="w-full table-fixed text-left">
      <thead className="border-b border-line bg-surface-muted/60 text-caption text-ink-muted">
        <tr>
          <th scope="col" className={head}>
            이름
          </th>
          <th scope="col" className={`${head} hidden md:table-cell`}>
            이메일
          </th>
          <th scope="col" className={`${head} hidden w-28 lg:table-cell`}>
            학번
          </th>
          <th scope="col" className={`${head} hidden w-32 lg:table-cell`}>
            마지막 로그인
          </th>
          <th scope="col" className={`${head} w-44 sm:w-48`}>
            역할
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-line">
        {users.map((user) => (
          <UserRoleRow
            key={user.id}
            user={user}
            isSelf={user.id === currentUserId}
            serverNow={serverNow}
          />
        ))}
      </tbody>
    </table>
  );
}
