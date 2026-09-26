import { useRef } from "react";
import type { KeyboardEvent } from "react";
import { STATUS_GROUPS } from "@/entities/submission";
import { cn } from "@/shared/lib/utils";

/**
 * 상태 그룹 탭 (명세 FR-DASH-02).
 *
 * 대시보드와 목록 화면이 같은 탭을 쓴다. 탭 이름과 묶음이 화면마다 다르면
 * 같은 신청이 한쪽에서는 "반려", 다른 쪽에서는 "반려됨"으로 보인다.
 *
 * 건수는 서버 요약(`byStatus`)에서 받은 값만 붙인다. 불러온 한 페이지로 세면
 * pagination 때문에 틀린다. 건수를 모르면 붙이지 않는다.
 *
 * 키보드: 좌우 화살표로 탭을 옮기고 곧바로 고른다. Home/End는 처음·끝으로 간다.
 * 탭 사이 이동은 화살표가 맡고, Tab 키는 탭 목록을 한 번에 건너뛴다.
 */
interface StatusGroupTabsProps {
  activeKey: string;
  onSelect: (key: string) => void;
  /** 그룹 key → 건수 */
  counts?: Record<string, number>;
  /** 탭이 제어하는 목록의 id */
  panelId?: string;
  className?: string;
}

export function StatusGroupTabs({
  activeKey,
  onSelect,
  counts,
  panelId,
  className,
}: StatusGroupTabsProps) {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const move = (event: KeyboardEvent<HTMLDivElement>) => {
    const current = STATUS_GROUPS.findIndex((group) => group.key === activeKey);
    const last = STATUS_GROUPS.length - 1;
    const target =
      event.key === "ArrowRight"
        ? current === last
          ? 0
          : current + 1
        : event.key === "ArrowLeft"
          ? current === 0
            ? last
            : current - 1
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? last
              : null;
    if (target === null) return;
    event.preventDefault();
    onSelect(STATUS_GROUPS[target]!.key);
    tabRefs.current[target]?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label="상태별 보기"
      onKeyDown={move}
      className={cn(
        "flex gap-5 overflow-x-auto border-b border-line",
        className,
      )}
    >
      {STATUS_GROUPS.map((group, index) => {
        const active = group.key === activeKey;
        const count = counts?.[group.key];
        return (
          <button
            key={group.key}
            ref={(element) => {
              tabRefs.current[index] = element;
            }}
            type="button"
            role="tab"
            id={`status-tab-${group.key}`}
            aria-selected={active}
            aria-controls={panelId}
            // 숫자가 붙어 "반려1"로 읽히지 않게 이름을 따로 준다.
            aria-label={
              count === undefined ? undefined : `${group.label} ${count}건`
            }
            tabIndex={active ? 0 : -1}
            onClick={() => onSelect(group.key)}
            className={cn(
              "relative shrink-0 pt-1 pb-2.5 text-label transition-colors duration-150",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
              "after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded-pill",
              active
                ? "font-semibold text-ink after:bg-ink"
                : "font-medium text-ink-muted after:bg-transparent hover:text-ink",
            )}
          >
            {group.label}
            {count !== undefined && (
              <span
                className={cn(
                  "ml-1.5 tabular-nums",
                  active ? "text-ink-muted" : "text-ink-subtle",
                )}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
