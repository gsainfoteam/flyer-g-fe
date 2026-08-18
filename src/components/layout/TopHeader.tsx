import { Plus } from "lucide-react";

export function TopHeader() {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-gray-900">
          안녕하세요, 지스트님!
          <span className="text-2xl">👋</span>
        </h1>
        <p className="mt-1.5 text-sm font-medium text-gray-500">
          전단지 관리 현황을 확인하고, 새 콘텐츠를 등록해 보세요.
        </p>
      </div>

      <div className="flex items-center gap-2.5">
        <div className="flex items-center gap-2.5 rounded-full bg-white py-1.5 pl-1.5 pr-3.5 shadow-sm ring-1 ring-gray-100">
          <div className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-400 text-xs font-black text-white">
            지
          </div>
          <div className="hidden leading-tight sm:block">
            <p className="text-xs font-black text-gray-900">지스트님</p>
            <p className="text-[10px] font-semibold text-gray-400">관리자</p>
          </div>
        </div>
        <a
          href="/studio"
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-violet-500 px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-violet-200"
        >
          <Plus className="size-4" />
          콘텐츠 등록
        </a>
      </div>
    </header>
  );
}
