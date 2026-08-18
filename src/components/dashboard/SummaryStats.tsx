import { cn } from "@/shared/lib/utils";

/**
 * 운영 요약 수치.
 *
 * 수치가 주인공이므로 아이콘과 카드 장식을 두지 않는다. 네 값을 한 줄에서 비교할 수
 * 있게 하고, 모든 수치가 같은 목록과 같은 기준 시각에서 나왔음을 아래에 밝힌다.
 * (명세 FR-DASH-01)
 */
export interface SummaryStatItem {
  label: string;
  value: number;
  unit: string;
  /** 주의가 필요한 값을 눈에 띄게 한다. 예: 승인 대기 */
  emphasis?: boolean;
}

interface SummaryStatsProps {
  items: SummaryStatItem[];
  caption: string;
}

export function SummaryStats({ items, caption }: SummaryStatsProps) {
  return (
    <section
      aria-label="운영 요약"
      className="overflow-hidden rounded-card border border-line bg-surface"
    >
      <dl className="grid grid-cols-2 md:grid-cols-4">
        {items.map((item, index) => (
          <div
            key={item.label}
            className={cn(
              "px-5 py-4",
              index % 2 === 1 && "border-l border-line",
              index >= 2 && "border-t border-line md:border-t-0",
              index >= 2 && index % 2 === 0 && "md:border-l",
              index === 1 && "md:border-l",
            )}
          >
            <dt className="text-caption text-ink-muted">{item.label}</dt>
            <dd className="mt-1 flex items-baseline gap-1">
              <span
                className={cn(
                  "text-metric tabular-nums",
                  item.emphasis && item.value > 0
                    ? "text-brand-strong"
                    : "text-ink",
                )}
              >
                {item.value}
              </span>
              <span className="text-caption text-ink-subtle">{item.unit}</span>
            </dd>
          </div>
        ))}
      </dl>
      <p className="border-t border-line bg-surface-muted px-5 py-2 text-caption text-ink-muted">
        {caption}
      </p>
    </section>
  );
}
