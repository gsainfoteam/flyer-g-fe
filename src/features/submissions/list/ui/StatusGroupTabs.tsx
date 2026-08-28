import { STATUS_GROUPS } from "@/entities/submission";
import { cn } from "@/shared/lib/utils";

/**
 * 상태 그룹 탭 (명세 FR-DASH-02).
 *
 * 건수는 붙이지 않는다. 탭별 건수를 정확히 내려면 서버가 상태별 count를 함께
 * 줘야 하는데 아직 그 계약이 없다. 현재 페이지에 실린 건수로 세면 pagination
 * 때문에 틀린 숫자가 된다. (`API-REQUIREMENTS.md` 5.4)
 */
interface StatusGroupTabsProps {
  activeKey: string;
  onSelect: (key: string) => void;
  className?: string;
}

export function StatusGroupTabs({
  activeKey,
  onSelect,
  className,
}: StatusGroupTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="상태별 보기"
      className={cn("flex gap-1 overflow-x-auto pb-1", className)}
    >
      {STATUS_GROUPS.map((group) => {
        const active = group.key === activeKey;
        return (
          <button
            key={group.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(group.key)}
            className={cn(
              "shrink-0 rounded-pill px-3.5 py-2 text-label font-semibold transition",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
              active
                ? "bg-ink text-ink-inverse"
                : "text-ink-muted hover:bg-surface-muted hover:text-ink",
            )}
          >
            {group.label}
          </button>
        );
      })}
    </div>
  );
}
