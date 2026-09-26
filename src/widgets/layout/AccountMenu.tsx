import { LogOut } from "lucide-react";
import { useAuth } from "@/features/auth/model/auth-context";
import {
  getPrimaryRole,
  getRoleLabel,
} from "@/features/auth/model/types";
import type { Role, SessionUser } from "@/features/auth/model/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";

/**
 * 계정 메뉴. 누가 로그인했는지, 로그아웃, 그리고 개발용 역할 전환을 한곳에 둔다.
 *
 * 화면 폭과 관계없이 같은 자리에 있다. 좁은 화면에서 로그아웃이나 역할 전환이
 * 사라지면 휴대폰으로는 계정을 바꿀 방법이 없다.
 *
 * 역할 전환은 mock 세션일 때만 나온다. production에서는 mock 인증이 선택되지
 * 않아 `switchRole`이 null이다. (`readAppEnv()`가 시작 시점에 막는다)
 */
export function AccountMenu({ user }: { user: SessionUser }) {
  const { signOut, switchRole, availableRoles } = useAuth();
  const primaryRole = getPrimaryRole(user);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="계정 메뉴"
        className="flex items-center gap-2.5 rounded-pill py-0.5 pr-0.5 pl-2 transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        <span className="hidden text-label text-ink-muted lg:block">
          {user.displayName} · {getRoleLabel(primaryRole)}
        </span>
        <span
          className="grid size-8 place-items-center rounded-pill bg-ink text-caption font-bold text-ink-inverse"
          aria-hidden="true"
        >
          {user.displayName.slice(0, 1)}
        </span>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="min-w-52">
        <DropdownMenuLabel className="flex flex-col">
          <span className="text-label text-ink">{user.displayName}</span>
          <span className="text-caption font-normal text-ink-muted">
            {getRoleLabel(primaryRole)}
          </span>
        </DropdownMenuLabel>

        {switchRole && availableRoles.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-caption font-normal text-ink-subtle">
              개발용 역할 전환
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={primaryRole}
              onValueChange={(role) => switchRole(role as Role)}
            >
              {availableRoles.map((role) => (
                <DropdownMenuRadioItem key={role} value={role}>
                  {getRoleLabel(role)}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void signOut()}>
          <LogOut aria-hidden="true" />
          로그아웃
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
