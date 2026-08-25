import { cn } from "@/shared/lib/utils";
import { Logo } from "../common/Logo";

/**
 * 관리 화면 내비게이션.
 *
 * 화면 위에 가로로 놓아 본문 폭을 넓게 쓴다. 현재 위치는 알약 배경으로 알리고,
 * 처리해야 할 건수만 강조색 배지로 붙인다.
 *
 * 좁은 화면의 대체 내비게이션과 실제 라우팅 연결은 Phase 01 범위다.
 */
export interface NavItem {
  label: string;
  href: string;
  /** 처리해야 할 건수. 0이면 배지를 그리지 않는다. */
  count?: number;
}

interface TopNavProps {
  items: NavItem[];
  /** Phase 01의 인증 세션에서 받아온다. 지금은 자리표시자다. */
  user: { name: string; role: string };
}

export function TopNav({ items, user }: TopNavProps) {
  const pathname = window.location.pathname;

  return (
    <header className="border-b border-line bg-surface">
      <div className="flex h-(--layout-header-height) items-center gap-8 px-6 lg:px-10">
        <a
          href="/"
          className="shrink-0 rounded-control focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus"
        >
          <Logo size="md" />
        </a>

        <nav aria-label="주요 메뉴" className="flex min-w-0 items-center gap-1.5">
          {items.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <a
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-pill px-3.5 py-2 text-label font-semibold transition",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
                  active
                    ? "bg-surface-muted text-ink"
                    : "text-ink-muted hover:bg-surface-muted hover:text-ink",
                )}
              >
                <span className="truncate">{item.label}</span>
                {item.count !== undefined && item.count > 0 && (
                  <span className="rounded-pill bg-accent px-[7px] py-px text-overline tabular-nums text-accent-on">
                    {item.count}
                  </span>
                )}
              </a>
            );
          })}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-3">
          <span className="hidden text-label text-ink-muted sm:block">
            {user.name} · {user.role}
          </span>
          <span
            className="grid size-[34px] place-items-center rounded-pill bg-surface-muted text-label font-bold text-ink"
            aria-hidden="true"
          >
            {user.name.slice(0, 1)}
          </span>
        </div>
      </div>
    </header>
  );
}
