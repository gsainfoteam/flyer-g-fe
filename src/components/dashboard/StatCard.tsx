import type { LucideIcon } from "lucide-react";
import { cn } from "@/shared/lib/utils";

/**
 * 운영 요약의 단일 수치.
 *
 * 증감률과 조회수는 근거 데이터가 없어 제거했다. 노출 통계는 수집 API가 확정된 뒤
 * Phase 03(FR-DASH-03)에서 다시 다룬다. (명세 FR-DASH-01)
 */
interface StatCardProps {
  label: string;
  value: string;
  unit?: string;
  icon: LucideIcon;
  tone?: "brand" | "info" | "warning" | "success";
}

const toneClassName: Record<NonNullable<StatCardProps["tone"]>, string> = {
  brand: "bg-brand-subtle text-brand-strong",
  info: "bg-info-subtle text-info-strong",
  warning: "bg-warning-subtle text-warning-strong",
  success: "bg-success-subtle text-success-strong",
};

export function StatCard({
  label,
  value,
  unit,
  icon: Icon,
  tone = "brand",
}: StatCardProps) {
  return (
    <article className="rounded-card border border-line bg-surface p-5 shadow-card">
      <div
        className={cn(
          "grid size-11 place-items-center rounded-control",
          toneClassName[tone],
        )}
      >
        <Icon className="size-5" aria-hidden="true" />
      </div>
      <p className="mt-4 text-body font-semibold text-ink-muted">{label}</p>
      <p className="mt-1 flex items-baseline gap-1">
        <span className="text-title font-black tracking-tight text-ink">
          {value}
        </span>
        {unit && <span className="text-body font-semibold text-ink-muted">{unit}</span>}
      </p>
    </article>
  );
}
