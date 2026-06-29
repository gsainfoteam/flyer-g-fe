import { ArrowRight } from "lucide-react";
import type { NoticeContent } from "../../types/content";
import { PosterCard } from "../common/PosterCard";

interface RecentContentSectionProps {
  contents: NoticeContent[];
}

const tabs = [
  { label: "전체", count: 24, active: true },
  { label: "게시 중", count: 8 },
  { label: "예약됨", count: 6 },
  { label: "임시저장", count: 4 },
  { label: "종료됨", count: 6 },
];

export function RecentContentSection({ contents }: RecentContentSectionProps) {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm shadow-violet-100/40">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black text-gray-900">내 콘텐츠</h2>
        <a
          href="/"
          className="inline-flex items-center gap-1 text-xs font-bold text-gray-400 hover:text-violet-600"
        >
          전체 보기 <ArrowRight className="size-3.5" />
        </a>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        {tabs.map((tab) => (
          <button
            key={tab.label}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition ${
              tab.active
                ? "bg-violet-600 text-white"
                : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            {tab.label}
            <span
              className={`text-[11px] ${
                tab.active ? "text-violet-100" : "text-gray-400"
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {contents.slice(0, 4).map((content) => (
          <PosterCard key={content.id} content={content} />
        ))}
      </div>
    </section>
  );
}
