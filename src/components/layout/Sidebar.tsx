import {
  LayoutDashboard,
  MonitorPlay,
  Upload,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Logo } from "../common/Logo";

interface MenuItem {
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
}

const menuItems: MenuItem[] = [
  {
    label: "홈",
    description: "대시보드",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    label: "콘텐츠 등록",
    description: "포스터 업로드 및 게시",
    href: "/studio",
    icon: Upload,
  },
  {
    label: "TV 디스플레이",
    description: "기숙사 게시판 미리보기",
    href: "/display",
    icon: MonitorPlay,
  },
];

export function Sidebar() {
  const pathname = window.location.pathname;

  return (
    <aside className="sticky top-0 hidden h-screen w-(--layout-sidebar-width) shrink-0 flex-col border-r border-line bg-surface px-4 py-6 md:flex">
      <div className="px-2">
        <Logo size="md" />
      </div>

      <nav className="mt-8 flex flex-1 flex-col gap-1">
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
                "group flex items-center gap-3 rounded-card px-3 py-2.5 transition",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
                active
                  ? "bg-brand-subtle text-brand-strong"
                  : "text-ink-muted hover:bg-surface-muted",
              )}
            >
              <span
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-control",
                  active
                    ? "bg-brand text-brand-on"
                    : "bg-surface-muted text-ink-subtle group-hover:bg-surface",
                )}
              >
                <Icon className="size-[18px]" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span
                  className={cn(
                    "block truncate text-body font-semibold",
                    active ? "text-brand-strong" : "text-ink",
                  )}
                >
                  {item.label}
                </span>
                <span className="block truncate text-caption text-ink-subtle">
                  {item.description}
                </span>
              </span>
            </a>
          );
        })}
      </nav>

      <a
        href="/display"
        className="mt-4 block overflow-hidden rounded-card bg-gradient-to-br from-brand to-brand-muted p-4 text-brand-on shadow-floating"
      >
        <p className="text-body font-black leading-snug">TV에 지금 표시 중</p>
        <p className="mt-1 text-caption font-semibold text-brand-subtle">
          기숙사 로비 디스플레이 미리보기
        </p>
        <span className="mt-3 inline-flex items-center gap-1 rounded-pill bg-surface/95 px-3 py-1.5 text-label font-black text-brand-strong">
          TV 미리보기 →
        </span>
      </a>
    </aside>
  );
}
