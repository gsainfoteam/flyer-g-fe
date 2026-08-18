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
    <div className="flex items-center gap-1 rounded-control border border-line bg-surface/80 p-1 backdrop-blur">
      {modes.map((item) => {
        const Icon = item.icon;
        const active = mode === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onModeChange(item.id)}
            aria-pressed={active}
            className={cn(
              "inline-flex items-center gap-2 rounded-sm px-3 py-1.5 text-caption transition",
              active
                ? "bg-ink text-surface"
                : "text-ink-muted hover:bg-surface-muted",
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
