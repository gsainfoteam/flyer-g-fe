import { Eye, LogOut, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router";
import { useAuth } from "@/features/auth/model/auth-context";
import {
  getPrimaryRole,
  getRoleLabel,
} from "@/features/auth/model/types";
import type { Role, SessionUser } from "@/features/auth/model/types";
import { to } from "@/shared/config/routes";
import { cn } from "@/shared/lib/utils";
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
 * 계정 메뉴. 누가 로그인했는지, 로그아웃, 사용자 화면 전환, 개발용 역할 전환을 한곳에
 * 둔다.
 *
 * 화면 폭과 관계없이 같은 자리에 있다. 좁은 화면에서 로그아웃이나 역할 전환이
 * 사라지면 휴대폰으로는 계정을 바꿀 방법이 없다.
 *
 * 역할 전환은 mock 세션일 때만 나온다. production에서는 mock 인증이 선택되지
 * 않아 `switchRole`이 null이다. (`readAppEnv()`가 시작 시점에 막는다)
 *
 * 사용자 화면 전환은 하우스 관리자·운영자가 일반 사용자에게 보이는 화면을 그대로 보는
 * 모드다. 메뉴와 화면만 바뀌고 서버 권한은 그대로다. 관리 화면에 있다가 전환하면 그
 * 화면을 볼 수 없으므로 홈으로 간다.
 */
export function AccountMenu({ user }: { user: SessionUser }) {
  const { state, signOut, switchRole, availableRoles, viewAsUser, setViewAsUser } =
    useAuth();
  const navigate = useNavigate();
  // 화면은 사용자로 보여도 메뉴는 실제 역할을 알린다.
  const realUser = state.status === "authenticated" ? state.user : user;
  const primaryRole = getPrimaryRole(realUser);
  const roleLabel = getRoleLabel(primaryRole);
  const canSwitchView = primaryRole !== "SUBMITTER";
  const switchView = (on: boolean) => {
    setViewAsUser(on);
    void navigate(to.home());
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="계정 메뉴"
        className="flex items-center gap-2.5 rounded-pill py-0.5 pr-0.5 pl-2 transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        <span className="hidden text-label text-ink-muted lg:block">
          {user.displayName} · {viewAsUser ? "사용자 화면" : roleLabel}
        </span>
        <span
          className={cn(
            "grid size-8 place-items-center rounded-pill bg-ink text-caption font-bold text-ink-inverse",
            // 좁은 화면에는 글자가 없어 사용자 화면임을 테두리로 알린다.
            viewAsUser && "ring-2 ring-accent ring-offset-2 ring-offset-surface",
          )}
          aria-hidden="true"
        >
          {user.displayName.slice(0, 1)}
        </span>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="min-w-52">
        <DropdownMenuLabel className="flex flex-col">
          <span className="text-label text-ink">{user.displayName}</span>
          <span className="text-caption font-normal text-ink-muted">
            {viewAsUser ? `${roleLabel} · 사용자 화면으로 보는 중` : roleLabel}
          </span>
        </DropdownMenuLabel>

        {canSwitchView && (
          <>
            <DropdownMenuSeparator />
            {viewAsUser ? (
              <DropdownMenuItem onSelect={() => switchView(false)}>
                <ShieldCheck aria-hidden="true" />
                {roleLabel} 화면으로 돌아가기
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onSelect={() => switchView(true)}>
                <Eye aria-hidden="true" />
                사용자 화면으로 보기
              </DropdownMenuItem>
            )}
          </>
        )}

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
