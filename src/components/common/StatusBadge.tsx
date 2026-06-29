import type { ContentStatus } from "../../types/content";

const statusLabel: Record<ContentStatus, string> = {
  published: "게시 중",
  scheduled: "예약됨",
  pending: "승인대기",
  ended: "종료됨",
};

const statusClassName: Record<ContentStatus, string> = {
  published: "bg-emerald-50 text-emerald-700",
  scheduled: "bg-orange-50 text-orange-600",
  pending: "bg-violet-50 text-violet-700",
  ended: "bg-gray-100 text-gray-500",
};

const dotClassName: Record<ContentStatus, string> = {
  published: "bg-emerald-500",
  scheduled: "bg-orange-500",
  pending: "bg-violet-500",
  ended: "bg-gray-400",
};

interface StatusBadgeProps {
  status: ContentStatus;
  className?: string;
}

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold shadow-sm backdrop-blur ${statusClassName[status]} ${className}`}
    >
      <span className={`size-1.5 rounded-full ${dotClassName[status]}`} />
      {statusLabel[status]}
    </span>
  );
}
