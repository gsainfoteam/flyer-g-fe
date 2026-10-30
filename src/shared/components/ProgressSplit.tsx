import { cn } from "@/shared/lib/utils";

/**
 * 몇 개 묶음이 전체에서 차지하는 비율을 한 줄 막대로 보여 준다(종류 구성).
 *
 * 막대는 꾸밈이라 읽지 않는다. 같은 값을 범례 글로 함께 둔다.
 */
export interface SplitPart {
  key: string;
  label: string;
  value: number;
  /** 칸의 바탕색 클래스 */
  barClass: string;
}

export function ProgressSplit({
  parts,
  className,
  thick = false,
}: {
  parts: readonly SplitPart[];
  className?: string;
  thick?: boolean;
}) {
  const shown = parts.filter((part) => part.value > 0);
  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex gap-[3px] overflow-hidden rounded-pill",
        thick ? "h-2.5" : "h-2",
        shown.length === 0 && "bg-current opacity-15",
        className,
      )}
    >
      {shown.map((part) => (
        <div
          key={part.key}
          className={part.barClass}
          style={{ flexGrow: part.value, flexBasis: 0 }}
        />
      ))}
    </div>
  );
}
