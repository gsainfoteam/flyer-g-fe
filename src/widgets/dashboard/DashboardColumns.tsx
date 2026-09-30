import type { ReactNode } from "react";

/**
 * 홈의 두 칸. 왼쪽은 주로 할 일과 목록, 오른쪽 좁은 칸은 곁에 두고 볼 상태다.
 * 좁은 화면에서는 왼쪽 칸 아래로 오른쪽 칸이 이어진다.
 */
export function DashboardColumns({
  main,
  side,
}: {
  main: ReactNode;
  side: ReactNode;
}) {
  return (
    <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_344px]">
      <div className="flex min-w-0 flex-col gap-5">{main}</div>
      <div className="flex min-w-0 flex-col gap-5">{side}</div>
    </div>
  );
}

/** 패널 제목 옆의 건수. 보조기기가 "검토 대기3"으로 붙여 읽지 않게 띄어 둔다. */
export function PanelCount({ value }: { value: number }) {
  return (
    <>
      {" "}
      <span className="ml-0.5 font-semibold text-ink-subtle tabular-nums">
        {value}
      </span>
    </>
  );
}
