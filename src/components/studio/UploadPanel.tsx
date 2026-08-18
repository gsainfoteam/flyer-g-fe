import { UploadCloud } from "lucide-react";
import type { NoticeContent } from "../../types/content";
import { PosterArtwork } from "../common/PosterArtwork";

interface UploadPanelProps {
  contents: NoticeContent[];
  selectedId: string;
  onSelectContent: (id: string) => void;
  onFileSelect: (file: File) => void;
  customPreviewUrl?: string | null;
}

export function UploadPanel({
  contents,
  selectedId,
  onSelectContent,
  onFileSelect,
  customPreviewUrl,
}: UploadPanelProps) {
  const uploaded = contents.slice(0, 6);

  return (
    <aside className="flex h-full w-[272px] shrink-0 flex-col overflow-y-auto border-r border-gray-100 bg-white">
      <div className="border-b border-gray-100 px-4 py-3.5">
        <h2 className="text-sm font-black text-gray-900">포스터 업로드</h2>
        <p className="mt-0.5 text-[11px] font-medium text-gray-400">
          이미지를 선택하거나 더미 포스터를 고르세요
        </p>
      </div>

      <div className="p-4">
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50/60 px-4 py-6 text-center transition hover:bg-violet-50">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onFileSelect(file);
            }}
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

        {customPreviewUrl && (
          <div className="mt-4 overflow-hidden rounded-xl ring-2 ring-violet-500">
            <div className="aspect-[3/4] w-full bg-gray-100">
              <img
                src={customPreviewUrl}
                alt="업로드 미리보기"
                className="h-full w-full object-cover"
              />
            </div>
            <p className="bg-violet-50 px-2 py-1.5 text-center text-[11px] font-bold text-violet-700">
              방금 업로드한 이미지
            </p>
          </div>
        )}

        <div className="mt-5">
          <h3 className="text-xs font-black text-gray-900">
            더미 포스터{" "}
            <span className="text-gray-400">({uploaded.length})</span>
          </h3>
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            {uploaded.map((content) => (
              <button
                key={content.id}
                onClick={() => onSelectContent(content.id)}
                className={`overflow-hidden rounded-xl ring-2 transition ${
                  !customPreviewUrl && selectedId === content.id
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
        </div>
      </div>
    </aside>
  );
}
