import { ArrowRight } from "lucide-react";
import { mockContents, pendingApprovals } from "../../data/mockContents";
import { PosterArtwork } from "../common/PosterArtwork";

export function ApprovalPanel() {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm shadow-violet-100/40">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-black text-gray-900">승인 대기</h2>
        <a
          href="/"
          className="inline-flex items-center gap-1 text-xs font-bold text-gray-400 hover:text-violet-600"
        >
          전체 보기 <ArrowRight className="size-3.5" />
        </a>
      </div>
      <div className="mt-4 space-y-3">
        {pendingApprovals.map((item) => {
          const poster = mockContents.find((c) => c.id === item.posterId);
          return (
            <div key={item.id} className="flex items-center gap-3">
              <div className="aspect-[3/4] w-9 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                {poster && <PosterArtwork content={poster} fit="cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-gray-900">
                  {item.title}
                </p>
                <p className="mt-0.5 text-[11px] font-semibold text-gray-400">
                  업로드: {item.uploadedAt}
                </p>
              </div>
              <button className="shrink-0 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-[11px] font-black text-violet-700 transition hover:bg-violet-100">
                승인하기
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
