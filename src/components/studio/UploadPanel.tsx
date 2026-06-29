import { Trash2, UploadCloud } from "lucide-react";
import { useState } from "react";
import type { NoticeContent } from "../../types/content";
import { PosterArtwork } from "../common/PosterArtwork";
import { PageManager } from "./PageManager";

interface UploadPanelProps {
  contents: NoticeContent[];
  selectedId: string;
  onSelectContent: (id: string) => void;
  pages: number[];
  selectedPage: number;
  onSelectPage: (page: number) => void;
  onAddPage: () => void;
}

const tabs = ["이미지 업로드", "내 업로드"];

export function UploadPanel({
  contents,
  selectedId,
  onSelectContent,
  pages,
  selectedPage,
  onSelectPage,
  onAddPage,
}: UploadPanelProps) {
  const [activeTab, setActiveTab] = useState(0);
  const uploaded = contents.slice(0, 4);

  return (
    <aside className="flex h-full w-[272px] shrink-0 flex-col overflow-y-auto border-r border-gray-100 bg-white">
      <div className="flex border-b border-gray-100">
        {tabs.map((tab, index) => (
          <button
            key={tab}
            onClick={() => setActiveTab(index)}
            className={`relative flex-1 py-3.5 text-sm font-bold transition ${
              activeTab === index ? "text-violet-700" : "text-gray-400"
            }`}
          >
            {tab}
            {activeTab === index && (
              <span className="absolute inset-x-4 -bottom-px h-0.5 rounded-full bg-violet-600" />
            )}
          </button>
        ))}
      </div>

      <div className="p-4">
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50/60 px-4 py-6 text-center transition hover:bg-violet-50">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
          />
          <div className="grid size-12 place-items-center rounded-full bg-white text-violet-600 shadow-sm">
            <UploadCloud className="size-6" />
          </div>
          <p className="mt-3 text-xs font-bold text-gray-700">
            이미지 파일을 드래그하거나 클릭해 업로드하세요
          </p>
          <p className="mt-1 text-[11px] font-semibold text-gray-400">
            JPG, PNG, WebP (최대 10MB)
          </p>
          <span className="mt-3 rounded-full bg-violet-600 px-4 py-1.5 text-xs font-black text-white">
            파일 선택
          </span>
        </label>

        <div className="mt-5 flex items-center justify-between">
          <h3 className="text-xs font-black text-gray-900">
            업로드된 이미지{" "}
            <span className="text-gray-400">({uploaded.length}/10)</span>
          </h3>
          <button className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-400 hover:text-gray-600">
            <Trash2 className="size-3.5" />
            전체 삭제
          </button>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2.5">
          {uploaded.map((content) => (
            <button
              key={content.id}
              onClick={() => onSelectContent(content.id)}
              className={`overflow-hidden rounded-xl ring-2 transition ${
                selectedId === content.id
                  ? "ring-violet-500"
                  : "ring-transparent hover:ring-violet-200"
              }`}
            >
              <div className="aspect-[3/4] w-full overflow-hidden bg-gray-100">
                <PosterArtwork content={content} fit="cover" />
              </div>
            </button>
          ))}
        </div>

        <PageManager
          pages={pages}
          selectedPage={selectedPage}
          onSelectPage={onSelectPage}
          onAddPage={onAddPage}
          posters={contents}
        />
      </div>
    </aside>
  );
}
