import { NavLink } from "react-router";
import { to } from "@/shared/config/routes";
import { hasAnyRole } from "@/features/auth/model/types";
import type { Role, SessionUser } from "@/features/auth/model/types";
import { cn } from "@/shared/lib/utils";
import { Logo } from "@/shared/components/Logo";
import { AccountMenu } from "@/widgets/layout/AccountMenu";

/**
 * 관리 화면 내비게이션.
 *
 * 화면 위에 가로로 놓아 본문 폭을 넓게 쓴다. 스크롤해도 따라오는 반투명
 * 헤더다. 현재 위치는 옅은 배경으로 알리고, 처리해야 할 건수만 강조색 배지로
 * 붙인다.
 *
 * 역할에 없는 메뉴는 그리지 않는다. 다만 이는 편의일 뿐 보안이 아니다 —
 * 직접 URL로 들어와도 route guard가 막고, 서버가 다시 검증한다.
 */
interface NavItem {
  label: string;
  href: string;
  allow?: readonly Role[];
  count?: number;
}

interface TopNavProps {
  user: SessionUser;
  /** 승인 대기 건수. 관리자에게만 배지로 보인다. */
  pendingCount?: number;
}

export function TopNav({ user, pendingCount = 0 }: TopNavProps) {
  const isReviewer = hasAnyRole(user, ["REVIEWER", "SUPER_ADMIN"]);

  const items: NavItem[] = [
    { label: "홈", href: to.dashboard() },
    // 관리자에게 이 목록은 내 신청과 전체 신청을 오가는 곳이다.
    { label: isReviewer ? "신청 목록" : "내 신청", href: to.submissions() },
    {
      label: "승인 대기",
      href: to.reviews(),
      allow: ["REVIEWER", "SUPER_ADMIN"],
      count: pendingCount,
    },
    // 기기 등록·설정은 시스템 운영자만 한다.
    { label: "기기", href: to.displays(), allow: ["SUPER_ADMIN"] },
  ];

  const visible = items.filter(
    (item) => !item.allow || hasAnyRole(user, item.allow),
  );

  return (
    <header className="sticky top-0 z-(--layer-header) border-b border-line bg-surface/90 backdrop-blur-sm">
      <div className="flex h-(--layout-header-height) items-center gap-4 px-4 sm:gap-8 sm:px-6 lg:px-10">
        <NavLink
          to={to.dashboard()}
          className="flex shrink-0 rounded-control focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus"
        >
          <Logo size="md" compact />
        </NavLink>

        {/* 좁은 화면에서는 가로로 밀어서 모든 메뉴에 닿을 수 있게 둔다. 스크롤바는
            숨긴다 — 헤더 높이 안에서 막대가 메뉴를 가린다. */}
        <nav
          aria-label="주요 메뉴"
          className="-mx-1 flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {visible.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              end={item.href === to.dashboard()}
              className={({ isActive }) =>
                cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-control px-3 py-1.5 text-label font-medium transition-colors duration-150",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
                  isActive
                    ? "bg-surface-muted font-semibold text-ink"
                    : "text-ink-muted hover:bg-surface-muted/70 hover:text-ink",
                )
              }
            >
              <span className="truncate">{item.label}</span>
              {item.count !== undefined && item.count > 0 && (
                <span className="rounded-pill bg-accent px-1.75 py-px text-overline tabular-nums text-accent-on">
                  {item.count}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <AccountMenu user={user} />
      </div>
    </header>
  );
}
