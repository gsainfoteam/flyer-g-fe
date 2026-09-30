import type { ReactNode } from "react";

/**
 * 홈 맨 위의 한 줄.
 *
 * 제목은 "지금 무엇을 해야 하는지"를 말하고, 설명은 그 근거가 되는 숫자를 한 줄로
 * 붙인다. 화면의 주인공은 아래 목록이라 제목을 크게 키우지 않는다. 날짜나 기준
 * 시각은 두지 않는다 — 홈을 여는 사람에게 필요한 정보가 아니다.
 */
interface DashboardHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  /** 오른쪽 주 작업 버튼 */
  action?: ReactNode;
}

export function DashboardHeader({
  title,
  description,
  action,
}: DashboardHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        <h1 className="text-heading text-ink">{title}</h1>
        {description && (
          <p className="mt-1 text-label font-normal text-ink-muted">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
