import {
  BarChart3,
  CalendarDays,
  CheckSquare,
  LayoutDashboard,
  Settings,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Logo } from "../common/Logo";

interface MenuItem {
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
  active?: boolean;
}

const menuItems: MenuItem[] = [
  {
    label: "홈",
    description: "대시보드",
    href: "/",
    icon: LayoutDashboard,
    active: true,
  },
  {
    label: "콘텐츠 제작 스튜디오",
    description: "콘텐츠 만들기 및 관리",
    href: "/studio",
    icon: Sparkles,
  },
  {
    label: "게시 일정",
    description: "게시 스케줄 관리",
    href: "/",
    icon: CalendarDays,
  },
  {
    label: "승인 관리",
    description: "승인 대기 및 히스토리",
    href: "/",
    icon: CheckSquare,
  },
  {
    label: "분석",
    description: "조회수 및 통계",
    href: "/",
    icon: BarChart3,
  },
  {
    label: "설정",
    description: "디스플레이 및 계정 설정",
    href: "/",
    icon: Settings,
  },
];

export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-[244px] shrink-0 flex-col border-r border-gray-100 bg-white px-4 py-6 md:flex">
      <div className="px-2">
        <Logo size="md" />
      </div>

      <nav className="mt-8 flex flex-1 flex-col gap-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <a
              key={item.label}
              href={item.href}
              className={`group flex items-center gap-3 rounded-2xl px-3 py-2.5 transition ${
                item.active
                  ? "bg-violet-50 text-violet-700"
                  : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              <span
                className={`grid size-9 shrink-0 place-items-center rounded-xl ${
                  item.active
                    ? "bg-violet-600 text-white"
                    : "bg-gray-50 text-gray-400 group-hover:bg-white"
                }`}
              >
                <Icon className="size-[18px]" />
              </span>
              <span className="min-w-0">
                <span
                  className={`block truncate text-sm font-bold ${
                    item.active ? "text-violet-700" : "text-gray-800"
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
        <p className="text-sm font-black leading-snug">
          전단지를 TV에 띄워보세요!
        </p>
        <p className="mt-1 text-[11px] font-semibold text-violet-100">
          간편한 디스플레이 연결 가이드
        </p>
        <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-3 py-1.5 text-xs font-black text-violet-700">
          가이드 보기 →
        </span>
      </a>
    </aside>
  );
}
