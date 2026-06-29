import { Bell, ChevronDown, HelpCircle, Plus } from "lucide-react";

export function TopHeader() {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-gray-900">
          안녕하세요, 지스트님!
          <span className="text-2xl">👋</span>
        </h1>
        <p className="mt-1.5 text-sm font-medium text-gray-500">
          오늘도 멋진 콘텐츠로 지스트 커뮤니티를 빛내주세요.
        </p>
      </div>

      <div className="flex items-center gap-2.5">
        <button className="relative grid size-10 place-items-center rounded-full bg-white text-gray-500 shadow-sm ring-1 ring-gray-100">
          <Bell className="size-[18px]" />
          <span className="absolute right-2.5 top-2.5 size-2 rounded-full bg-[#F15A24] ring-2 ring-white" />
        </button>
        <div className="flex items-center gap-2.5 rounded-full bg-white py-1.5 pl-1.5 pr-3.5 shadow-sm ring-1 ring-gray-100">
          <div className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-400 text-xs font-black text-white">
            지
          </div>
          <div className="hidden leading-tight sm:block">
            <p className="text-xs font-black text-gray-900">지스트님</p>
            <p className="text-[10px] font-semibold text-gray-400">관리자</p>
          </div>
        </div>
        <button className="hidden size-10 place-items-center rounded-full bg-white text-gray-500 shadow-sm ring-1 ring-gray-100 md:grid">
          <HelpCircle className="size-[18px]" />
        </button>
        <a
          href="/studio"
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-violet-500 px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-violet-200"
        >
          <Plus className="size-4" />
          콘텐츠 제작
          <ChevronDown className="size-4 opacity-80" />
        </a>
      </div>
    </header>
  );
}
