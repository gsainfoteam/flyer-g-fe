import { Grid2X2, Square } from "lucide-react";
import { cn } from "@/shared/lib/utils";

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
    <div className="flex items-center gap-1 rounded-pill bg-surface/70 p-1.5 shadow-floating ring-1 ring-white/60 backdrop-blur-xl">
      {modes.map((item) => {
        const Icon = item.icon;
        const active = mode === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onModeChange(item.id)}
            aria-pressed={active}
            className={cn(
              "inline-flex items-center gap-2 rounded-pill px-4 py-2 text-body font-bold transition",
              active
                ? "bg-brand text-brand-on shadow-card"
                : "text-ink-muted hover:bg-surface",
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
