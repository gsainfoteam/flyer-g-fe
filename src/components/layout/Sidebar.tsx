import {
  LayoutDashboard,
  MonitorPlay,
  Upload,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
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
    <aside className="sticky top-0 hidden h-screen w-[244px] shrink-0 flex-col border-r border-gray-100 bg-white px-4 py-6 md:flex">
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
              className={`group flex items-center gap-3 rounded-2xl px-3 py-2.5 transition ${
                active
                  ? "bg-violet-50 text-violet-700"
                  : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              <span
                className={`grid size-9 shrink-0 place-items-center rounded-xl ${
                  active
                    ? "bg-violet-600 text-white"
                    : "bg-gray-50 text-gray-400 group-hover:bg-white"
                }`}
              >
                <Icon className="size-[18px]" />
              </span>
              <span className="min-w-0">
                <span
                  className={`block truncate text-sm font-bold ${
                    active ? "text-violet-700" : "text-gray-800"
                  }`}
                >
                  {item.label}
                </span>
                <span className="block truncate text-[11px] font-medium text-gray-400">
                  {item.description}
                </span>
              </span>
            </a>
          );
        })}
      </nav>

      <a
        href="/display"
        className="mt-4 block overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-500 p-4 text-white shadow-lg shadow-violet-200"
      >
        <p className="text-sm font-black leading-snug">TV에 지금 표시 중</p>
        <p className="mt-1 text-[11px] font-semibold text-violet-100">
          기숙사 로비 디스플레이 미리보기
        </p>
        <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-3 py-1.5 text-xs font-black text-violet-700">
          TV 미리보기 →
        </span>
      </a>
    </aside>
  );
}
