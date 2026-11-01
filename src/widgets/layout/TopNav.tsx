import { Link, NavLink, useLocation } from "react-router";
import { to } from "@/shared/config/routes";
import { hasAnyRole } from "@/features/auth/model/types";
import type { Role, SessionUser } from "@/features/auth/model/types";
import { cn } from "@/shared/lib/utils";
import { Logo } from "@/shared/components/Logo";
import { AccountMenu } from "@/widgets/layout/AccountMenu";

/**
 * 관리 화면 내비게이션. 역할마다 메뉴가 다르다. (기획 1절)
 *
 * - 사용자: 홈 · 내 컨텐츠
 * - 하우스 관리자: 홈 · 심사 · 전체 컨텐츠
 * - 운영자: 홈 · 심사 · TV · 설정
 *
 * 지금 위치는 검은 알약으로, 처리해야 할 건수만 빨간 배지로 붙인다.
 * 역할에 없는 메뉴는 그리지 않는다. 다만 이는 편의일 뿐 보안이 아니다 —
 * 직접 URL로 들어와도 route guard가 막고, 서버가 다시 검증한다.
 */
interface NavItem {
  label: string;
  href: string;
  /** 이 경로로 시작하는 하위 화면에서도 켜 둔다. */
  match?: string;
  allow?: readonly Role[];
  /** 이 역할이 있으면 숨긴다. */
  hideFor?: readonly Role[];
  count?: number;
}

interface TopNavProps {
  user: SessionUser;
  /** 심사 대기 건수. 관리자에게만 배지로 보인다. */
  pendingCount?: number;
}

export function TopNav({ user, pendingCount = 0 }: TopNavProps) {
  const { pathname } = useLocation();

  const items: NavItem[] = [
    { label: "홈", href: to.home() },
    // 관리자는 전체 컨텐츠에서 내 것도 찾는다. 메뉴는 할 일 순서로 짧게 둔다.
    {
      label: "내 컨텐츠",
      href: to.mine(),
      match: "/mine",
      hideFor: ["REVIEWER", "SUPER_ADMIN"],
    },
    {
      label: "심사",
      href: to.review(),
      match: "/review",
      allow: ["REVIEWER", "SUPER_ADMIN"],
      count: pendingCount,
    },
    {
      label: "전체 컨텐츠",
      href: to.contents(),
      match: "/contents",
      allow: ["REVIEWER"],
      hideFor: ["SUPER_ADMIN"],
    },
    { label: "TV", href: to.tv(), match: "/tv", allow: ["SUPER_ADMIN"] },
    {
      label: "설정",
      href: to.roleSettings(),
      match: "/settings",
      allow: ["SUPER_ADMIN"],
    },
  ];

  const visible = items.filter(
    (item) =>
      (!item.allow || hasAnyRole(user, item.allow)) &&
      !(item.hideFor && hasAnyRole(user, item.hideFor)),
  );
  const isCurrent = (item: NavItem) =>
    item.match ? pathname.startsWith(item.match) : pathname === item.href;

  return (
    <header className="sticky top-0 z-(--layer-header) border-b border-line bg-surface/90 backdrop-blur-sm">
      <div className="flex h-(--layout-header-height) items-center gap-4 px-4 sm:gap-8 sm:px-6 lg:px-10">
        <NavLink
          to={to.home()}
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
          {visible.map((item) => {
            const current = isCurrent(item);
            return (
              <Link
                key={item.href}
                to={item.href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-pill px-3.5 text-label transition-colors duration-150",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
                  current
                    ? "bg-ink font-bold text-ink-inverse"
                    : "font-medium text-ink-muted hover:bg-surface-muted hover:text-ink",
                )}
              >
                <span className="truncate">{item.label}</span>
                {item.count !== undefined && item.count > 0 && (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-pill bg-accent px-1.5 text-overline font-extrabold tabular-nums text-accent-on">
                    {item.count}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <AccountMenu user={user} />
      </div>
    </header>
  );
}
