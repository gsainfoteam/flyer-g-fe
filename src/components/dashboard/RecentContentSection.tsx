import { useMemo, useState } from "react";
import type { ContentStatus, NoticeContent } from "../../types/content";
import { PosterCard } from "../common/PosterCard";

interface RecentContentSectionProps {
  contents: NoticeContent[];
}

type FilterKey = "all" | ContentStatus;

const filterTabs: { key: FilterKey; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "published", label: "게시 중" },
  { key: "scheduled", label: "예약됨" },
  { key: "pending", label: "승인대기" },
  { key: "ended", label: "종료됨" },
];

export function RecentContentSection({ contents }: RecentContentSectionProps) {
  const [filter, setFilter] = useState<FilterKey>("all");

  const counts = useMemo(() => {
    return {
      all: contents.length,
      published: contents.filter((c) => c.status === "published").length,
      scheduled: contents.filter((c) => c.status === "scheduled").length,
      pending: contents.filter((c) => c.status === "pending").length,
      ended: contents.filter((c) => c.status === "ended").length,
    };
  }, [contents]);

  const filtered = useMemo(() => {
    if (filter === "all") return contents;
    return contents.filter((c) => c.status === filter);
  }, [contents, filter]);

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm shadow-violet-100/40">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black text-gray-900">내 콘텐츠</h2>
        <a
          href="/studio"
          className="text-xs font-bold text-violet-600 hover:text-violet-700"
        >
          새 콘텐츠 등록 →
        </a>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        {filterTabs.map((tab) => {
          const active = filter === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition ${
                active
                  ? "bg-violet-600 text-white"
                  : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              {tab.label}
              <span
                className={`text-[11px] ${
                  active ? "text-violet-100" : "text-gray-400"
                }`}
              >
                {counts[tab.key]}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {filtered.slice(0, 4).map((content) => (
          <PosterCard key={content.id} content={content} />
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full py-10 text-center text-sm font-semibold text-gray-400">
            해당 상태의 콘텐츠가 없습니다.
          </p>
        )}
      </div>
    </section>
  );
}
