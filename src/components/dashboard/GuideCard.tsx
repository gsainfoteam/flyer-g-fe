import { ArrowRight, ClipboardList } from "lucide-react";

export function GuideCard() {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-white p-5 shadow-sm shadow-violet-100/40">
      <div className="relative z-10 max-w-[70%]">
        <h2 className="text-base font-black text-gray-900">콘텐츠 제작 가이드</h2>
        <p className="mt-2 text-xs font-semibold leading-relaxed text-gray-500">
          더 멋진 전단지를 만들 수 있도록 가이드를 확인해보세요.
        </p>
        <a
          href="/studio"
          className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-black text-violet-700 shadow-sm ring-1 ring-violet-100"
        >
          가이드 보기 <ArrowRight className="size-3.5" />
        </a>
      </div>
      <div className="absolute -bottom-3 -right-3 grid size-24 place-items-center rounded-2xl bg-violet-100/60 text-violet-400">
        <ClipboardList className="size-12" />
      </div>
    </section>
  );
}
