import { useSessionUser } from "@/features/auth/model/auth-context";
import { UserRolesBrowser } from "@/features/user-roles/ui/UserRolesBrowser";
import { SectionHeader } from "@/shared/components";

/**
 * 사용자 권한 (gsainfoteam/flyer-g-be#17). 시스템 운영자만 본다.
 *
 * 하우스 관리자와 시스템 운영자를 정한다. 한 번 이상 로그인한 사람만 찾을 수 있다.
 * 바뀐 권한은 서버에서 바로 적용되고, 그 사람의 메뉴는 앱이 세션을 다시 불러오면
 * 바뀐다.
 */
export function UsersPage() {
  const user = useSessionUser();

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        as="h1"
        title="사용자 권한"
        description="하우스 관리자·시스템 운영자 지정"
      />
      <UserRolesBrowser currentUserId={user.id} />
    </div>
  );
}
