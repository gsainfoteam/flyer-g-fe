import {
  LayoutTemplate,
  Palette,
  QrCode,
  Settings,
  Shapes,
  Type,
  Upload,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Tool {
  label: string;
  icon: LucideIcon;
  active?: boolean;
}

const topTools: Tool[] = [
  { label: "템플릿", icon: LayoutTemplate },
  { label: "업로드", icon: Upload, active: true },
  { label: "요소", icon: Shapes },
  { label: "텍스트", icon: Type },
  { label: "배경", icon: Palette },
  { label: "QR 코드", icon: QrCode },
];

function ToolButton({ tool }: { tool: Tool }) {
  const Icon = tool.icon;
  return (
    <button
      className={`flex w-full flex-col items-center gap-1 rounded-xl py-2.5 text-[10px] font-bold transition ${
        tool.active
          ? "bg-violet-50 text-violet-700"
          : "text-gray-400 hover:bg-gray-50 hover:text-gray-600"
      }`}
    >
      <Icon className="size-5" />
      {tool.label}
    </button>
  );
}

export function StudioSidebar() {
  return (
    <aside className="flex h-full w-[76px] shrink-0 flex-col justify-between border-r border-gray-100 bg-white px-2 py-3">
      <nav className="space-y-1">
        {topTools.map((tool) => (
          <ToolButton key={tool.label} tool={tool} />
        ))}
      </nav>
      <ToolButton tool={{ label: "설정", icon: Settings }} />
    </aside>
  );
}
