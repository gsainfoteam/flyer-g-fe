import { TrendingUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  unit?: string;
  change: string;
  icon: LucideIcon;
  tone?: "violet" | "blue" | "orange" | "green";
}

const toneClassName = {
  violet: "bg-violet-100 text-violet-600",
  blue: "bg-sky-100 text-sky-600",
  orange: "bg-orange-100 text-orange-600",
  green: "bg-emerald-100 text-emerald-600",
};

export function StatCard({
  label,
  value,
  unit,
  change,
  icon: Icon,
  tone = "violet",
}: StatCardProps) {
  return (
    <article className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm shadow-violet-100/40">
      <div className="flex items-start justify-between">
        <div
          className={`grid size-11 place-items-center rounded-xl ${toneClassName[tone]}`}
        >
          <Icon className="size-5" />
        </div>
      </div>
      <p className="mt-4 text-sm font-bold text-gray-500">{label}</p>
      <p className="mt-1 flex items-baseline gap-1">
        <span className="text-2xl font-black tracking-tight text-gray-900">
          {value}
        </span>
        {unit && (
          <span className="text-sm font-bold text-gray-500">{unit}</span>
        )}
      </p>
      <div className="mt-3 flex items-center gap-1.5 text-xs font-bold">
        <span className="text-gray-400">지난 7일 대비</span>
        <span className="inline-flex items-center gap-0.5 text-emerald-600">
          <TrendingUp className="size-3.5" />
          {change}
        </span>
      </div>
    </article>
  );
}
