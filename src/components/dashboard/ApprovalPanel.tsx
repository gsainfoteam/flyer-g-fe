import { useState } from "react";
import {
  mockContents,
  pendingApprovals as initialApprovals,
  type ApprovalItem,
} from "../../data/mockContents";
import { PosterArtwork } from "../common/PosterArtwork";

interface ApprovalPanelProps {
  onToast?: (message: string) => void;
}

export function ApprovalPanel({ onToast }: ApprovalPanelProps) {
  const [items, setItems] = useState<ApprovalItem[]>(initialApprovals);

  const handleApprove = (item: ApprovalItem) => {
    setItems((current) => current.filter((entry) => entry.id !== item.id));
    onToast?.(`「${item.title}」이(가) 승인되었습니다.`);
  };

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm shadow-violet-100/40">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-black text-gray-900">승인 대기</h2>
        <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-black text-violet-700">
          {items.length}건
        </span>
      </div>
      <div className="mt-4 space-y-3">
        {items.map((item) => {
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
              <button
                onClick={() => handleApprove(item)}
                className="shrink-0 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-[11px] font-black text-violet-700 transition hover:bg-violet-100"
              >
                승인하기
              </button>
            </div>
          );
        })}
        {items.length === 0 && (
          <p className="py-6 text-center text-sm font-semibold text-gray-400">
            승인 대기 항목이 없습니다.
          </p>
        )}
      </div>
    </section>
  );
}
