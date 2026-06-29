import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  ChevronDown,
  Download,
  Image as ImageIcon,
} from "lucide-react";
import { useState } from "react";
import { QRCodeBox } from "../common/QRCodeBox";

interface DesignPanelProps {
  qrValue: string;
  onQrValueChange: (value: string) => void;
}

const panelTabs = ["디자인", "페이지 설정", "애니메이션"];
const alignIcons = [AlignLeft, AlignCenter, AlignRight, AlignJustify];
const pointColors = [
  { color: "#F15A24", active: true },
  { color: "#7C3AED" },
  { color: "#3B82F6" },
  { color: "#10B981" },
  { color: "#EC4899" },
];

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-[11px] font-bold text-gray-500">{children}</p>
  );
}

export function DesignPanel({ qrValue, onQrValueChange }: DesignPanelProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [activeAlign, setActiveAlign] = useState(0);
  const [fontSize, setFontSize] = useState(48);

  return (
    <aside className="flex h-full w-[288px] shrink-0 flex-col overflow-y-auto border-l border-gray-100 bg-white">
      <div className="flex border-b border-gray-100 px-2">
        {panelTabs.map((tab, index) => (
          <button
            key={tab}
            onClick={() => setActiveTab(index)}
            className={`relative flex-1 py-3.5 text-xs font-bold transition ${
              activeTab === index ? "text-violet-700" : "text-gray-400"
            }`}
          >
            {tab}
            {activeTab === index && (
              <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-violet-600" />
            )}
          </button>
        ))}
      </div>

      <div className="space-y-6 p-4">
        <section>
          <h3 className="mb-3 text-sm font-black text-gray-900">배경</h3>
          <FieldLabel>배경 색상</FieldLabel>
          <div className="flex gap-2">
            <div className="flex flex-1 items-center gap-2 rounded-xl border border-gray-200 px-3 py-2.5">
              <span className="size-5 rounded-md border border-gray-200 bg-white" />
              <span className="text-xs font-bold text-gray-700">#FFFFFF</span>
            </div>
            <button className="flex items-center gap-1 rounded-xl border border-gray-200 px-3 py-2.5 text-xs font-bold text-gray-700">
              100% <ChevronDown className="size-3.5 text-gray-400" />
            </button>
          </div>
          <div className="mt-3">
            <FieldLabel>배경 이미지</FieldLabel>
            <div className="flex gap-2">
              <button className="flex flex-1 items-center justify-between rounded-xl border border-gray-200 px-3 py-2.5 text-xs font-bold text-gray-400">
                이미지 없음 <ChevronDown className="size-3.5" />
              </button>
              <button className="grid size-10 place-items-center rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50">
                <ImageIcon className="size-4" />
              </button>
            </div>
          </div>
        </section>

        <section className="border-t border-gray-100 pt-5">
          <h3 className="mb-3 text-sm font-black text-gray-900">텍스트 스타일</h3>
          <button className="flex w-full items-center justify-between rounded-xl border border-gray-200 px-3 py-2.5 text-xs font-bold text-gray-700">
            Pretendard <ChevronDown className="size-3.5 text-gray-400" />
          </button>
          <div className="mt-2 flex gap-2">
            <button className="flex flex-1 items-center justify-between rounded-xl border border-gray-200 px-3 py-2.5 text-xs font-bold text-gray-700">
              Bold <ChevronDown className="size-3.5 text-gray-400" />
            </button>
            <div className="flex flex-1 items-center gap-2 rounded-xl border border-gray-200 px-3 py-2.5">
              <span className="size-5 rounded-md bg-gray-900" />
              <span className="text-xs font-bold text-gray-700">#111111</span>
            </div>
          </div>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {alignIcons.map((Icon, index) => (
              <button
                key={index}
                onClick={() => setActiveAlign(index)}
                className={`grid h-10 place-items-center rounded-xl border transition ${
                  activeAlign === index
                    ? "border-violet-200 bg-violet-50 text-violet-700"
                    : "border-gray-200 text-gray-500 hover:bg-gray-50"
                }`}
              >
                <Icon className="size-4" />
              </button>
            ))}
          </div>
          <div className="mt-4">
            <FieldLabel>글자 크기</FieldLabel>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-xl border border-gray-200 px-2 py-1.5">
                <button
                  onClick={() => setFontSize((v) => Math.max(8, v - 1))}
                  className="grid size-6 place-items-center rounded-md text-gray-500 hover:bg-gray-50"
                >
                  −
                </button>
                <span className="w-6 text-center text-xs font-black text-gray-800">
                  {fontSize}
                </span>
                <button
                  onClick={() => setFontSize((v) => Math.min(120, v + 1))}
                  className="grid size-6 place-items-center rounded-md text-gray-500 hover:bg-gray-50"
                >
                  +
                </button>
              </div>
              <input
                type="range"
                min={8}
                max={120}
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="flex-1 accent-violet-600"
              />
            </div>
          </div>
        </section>

        <section className="border-t border-gray-100 pt-5">
          <h3 className="mb-3 text-sm font-black text-gray-900">포인트 색상</h3>
          <div className="flex gap-2.5">
            {pointColors.map((c) => (
              <button
                key={c.color}
                className={`grid size-9 place-items-center rounded-full text-white ring-2 ring-offset-2 ${
                  c.active ? "ring-gray-300" : "ring-transparent"
                }`}
                style={{ backgroundColor: c.color }}
              >
                {c.active && <span className="text-sm font-black">✓</span>}
              </button>
            ))}
          </div>
        </section>

        <section className="border-t border-gray-100 pt-5">
          <h3 className="mb-3 text-sm font-black text-gray-900">QR 코드</h3>
          <input
            value={qrValue}
            onChange={(event) => onQrValueChange(event.target.value)}
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-xs font-semibold text-gray-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            placeholder="https://ziggle.gist.ac.kr/..."
          />
          <div className="mt-3 flex items-center gap-3">
            <QRCodeBox value={qrValue} size="md" />
            <div className="flex-1 space-y-2">
              <button className="w-full rounded-xl bg-violet-600 px-3 py-2.5 text-xs font-black text-white hover:bg-violet-700">
                QR 코드 변경
              </button>
              <button className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2.5 text-xs font-black text-gray-700 hover:bg-gray-50">
                <Download className="size-3.5" />
                다운로드
              </button>
            </div>
          </div>
        </section>
      </div>
    </aside>
  );
}
