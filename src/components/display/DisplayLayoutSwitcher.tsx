import { Grid2X2, Square } from "lucide-react";

export type DisplayMode = "single" | "four";

const modes = [
  { id: "single" as const, label: "1개 크게 보기", icon: Square },
  { id: "four" as const, label: "4분할", icon: Grid2X2 },
];

interface DisplayLayoutSwitcherProps {
  mode: DisplayMode;
  onModeChange: (mode: DisplayMode) => void;
}

export function DisplayLayoutSwitcher({
  mode,
  onModeChange,
}: DisplayLayoutSwitcherProps) {
  return (
    <div className="flex items-center gap-1 rounded-full bg-white/70 p-1.5 shadow-lg shadow-violet-300/20 ring-1 ring-white/60 backdrop-blur-xl">
      {modes.map((item) => {
        const Icon = item.icon;
        const active = mode === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onModeChange(item.id)}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition ${
              active
                ? "bg-violet-600 text-white shadow-md shadow-violet-300"
                : "text-gray-500 hover:bg-white"
            }`}
          >
            <Icon className="size-4" />
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
