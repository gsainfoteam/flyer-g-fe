import { LayoutDashboard, MonitorPlay, Upload } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Logo } from "../common/Logo";

interface MenuItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

const menuItems: MenuItem[] = [
  { label: "대시보드", href: "/", icon: LayoutDashboard },
  { label: "콘텐츠 등록", href: "/studio", icon: Upload },
  { label: "TV 디스플레이", href: "/display", icon: MonitorPlay },
];

/**
 * 관리 화면 내비게이션.
 *
 * 장식용 프로모 카드를 두지 않는다. 사이드바는 현재 위치를 알리고 화면을 옮기는
 * 역할만 한다. 좁은 화면의 대체 내비게이션은 Phase 01 범위다.
 */
export function Sidebar() {
  const pathname = window.location.pathname;

  return (
    <aside className="sticky top-0 hidden h-screen w-(--layout-sidebar-width) shrink-0 flex-col border-r border-line bg-surface px-3 py-5 md:flex">
      <div className="px-2 pb-5">
        <Logo size="md" />
      </div>

      <nav className="flex flex-1 flex-col gap-0.5">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <a
              key={item.label}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-control px-2.5 py-2 text-label transition",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
                active
                  ? "bg-brand-subtle font-semibold text-brand-strong"
                  : "text-ink-muted hover:bg-surface-muted hover:text-ink",
              )}
            >
              <Icon
                className={cn(
                  "size-4 shrink-0",
                  active ? "text-brand" : "text-ink-subtle",
                )}
                aria-hidden="true"
              />
              <span className="truncate">{item.label}</span>
            </a>
          );
        })}
      </nav>
    </aside>
  );
}
