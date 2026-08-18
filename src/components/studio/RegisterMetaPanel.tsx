import type { ContentCategory } from "../../types/content";
import { QRCodeBox } from "../common/QRCodeBox";

interface RegisterMetaPanelProps {
  title: string;
  category: ContentCategory;
  startDate: string;
  endDate: string;
  linkUrl: string;
  onTitleChange: (value: string) => void;
  onCategoryChange: (value: ContentCategory) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onLinkUrlChange: (value: string) => void;
}

const categories: ContentCategory[] = ["공지", "동아리", "공연", "행사", "학과"];

export function RegisterMetaPanel({
  title,
  category,
  startDate,
  endDate,
  linkUrl,
  onTitleChange,
  onCategoryChange,
  onStartDateChange,
  onEndDateChange,
  onLinkUrlChange,
}: RegisterMetaPanelProps) {
  return (
    <aside className="flex h-full w-[288px] shrink-0 flex-col overflow-y-auto border-l border-gray-100 bg-white">
      <div className="border-b border-gray-100 px-4 py-3.5">
        <h2 className="text-sm font-black text-gray-900">게시 정보</h2>
        <p className="mt-0.5 text-[11px] font-medium text-gray-400">
          제목, 기간, 링크를 입력하세요
        </p>
      </div>

      <div className="space-y-5 p-4">
        <label className="block">
          <span className="mb-1.5 block text-[11px] font-bold text-gray-500">
            제목
          </span>
          <input
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-semibold text-gray-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-[11px] font-bold text-gray-500">
            카테고리
          </span>
          <select
            value={category}
            onChange={(e) =>
              onCategoryChange(e.target.value as ContentCategory)
            }
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-semibold text-gray-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
          >
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-bold text-gray-500">
              시작일
            </span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-2 py-2.5 text-xs font-semibold text-gray-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-bold text-gray-500">
              종료일
            </span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-2 py-2.5 text-xs font-semibold text-gray-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            />
          </label>
        </div>

        <div>
          <span className="mb-1.5 block text-[11px] font-bold text-gray-500">
            상세 링크 (QR)
          </span>
          <input
            value={linkUrl}
            onChange={(e) => onLinkUrlChange(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-xs font-semibold text-gray-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            placeholder="https://ziggle.gist.ac.kr/..."
          />
          <div className="mt-3 flex items-center gap-3 rounded-2xl bg-gray-50 p-3">
            <QRCodeBox value={linkUrl || "empty"} size="md" />
            <p className="text-[11px] font-semibold leading-relaxed text-gray-500">
              링크가 바뀌면 QR 미리보기도 함께 갱신됩니다.
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
