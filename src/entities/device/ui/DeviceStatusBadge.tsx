import type { DeviceStatus } from "@/entities/device/model/types";
import { cn } from "@/shared/lib/utils";

/**
 * 기기 연결 상태. 서버가 마지막 heartbeat로 판정한 값을 그대로 보여준다(3분).
 * 색은 보조 신호이고 구분은 글자가 맡는다. (명세 9.6)
 */
const STATUS_STYLE: Record<
  DeviceStatus,
  { label: string; pill: string; dot: string }
> = {
  ONLINE: {
    label: "온라인",
    pill: "bg-success-subtle text-success-strong",
    dot: "bg-success",
  },
  OFFLINE: {
    label: "오프라인",
    pill: "bg-attention-subtle text-attention-strong",
    dot: "bg-attention",
  },
  DISABLED: {
    label: "사용 안 함",
    pill: "bg-surface-muted text-ink-muted",
    dot: "bg-ink-subtle",
  },
};

export function DeviceStatusBadge({
  status,
  className,
}: {
  status: DeviceStatus;
  className?: string;
}) {
  const style = STATUS_STYLE[status];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-pill px-2.5 py-1 text-overline",
        style.pill,
        className,
      )}
    >
      <span
        className={cn("size-1.5 rounded-pill", style.dot)}
        aria-hidden="true"
      />
      {style.label}
    </span>
  );
}
