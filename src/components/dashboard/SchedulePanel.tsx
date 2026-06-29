import { ArrowRight } from "lucide-react";
import { scheduleItems } from "../../data/mockContents";

const toneDot = {
  violet: "bg-violet-500",
  green: "bg-emerald-500",
  orange: "bg-orange-500",
  gray: "bg-gray-300",
};

export function SchedulePanel() {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm shadow-violet-100/40">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-black text-gray-900">예정된 일정</h2>
        <a
          href="/"
          className="inline-flex items-center gap-1 text-xs font-bold text-gray-400 hover:text-violet-600"
        >
          전체 보기 <ArrowRight className="size-3.5" />
        </a>
      </div>
      <div className="mt-4 space-y-1">
        {scheduleItems.map((item) => (
          <div
            key={`${item.date}-${item.title}`}
            className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-gray-50"
          >
            <div className="w-12 shrink-0 text-center">
              <p className="text-sm font-black text-gray-900">{item.date}</p>
              <p className="text-[10px] font-bold text-gray-400">
                ({item.day}) {item.time}
              </p>
            </div>
            <span
              className={`size-2 shrink-0 rounded-full ${toneDot[item.tone]}`}
            />
            <p className="min-w-0 flex-1 truncate text-sm font-bold text-gray-700">
              {item.title}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
