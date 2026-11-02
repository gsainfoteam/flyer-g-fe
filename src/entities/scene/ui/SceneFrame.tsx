import { useMemo } from "react";
import type { ReactNode } from "react";
import { LiveClock } from "@/shared/components/LiveClock";
import { LogoMark } from "@/shared/components/Logo";
import { encodeQrMatrix, qrViewBoxSize, toQrPathData } from "@/shared/lib/qr";

/**
 * TV 한 화면(장면)의 축소판. 1920×1080 틀을 컨테이너 폭에 맞춰 `cqw`로 줄인다.
 * (기획 3절 TV 화면, PR #36 틀)
 *
 * 머리 줄(로고·기기 이름·장면 위치), 카드, 하단 정보줄로 짠다. 플레이어 v2(9.4)가
 * 들어오기 전까지는 작성 화면과 심사 화면의 미리보기에서만 쓴다. 정보줄의 날씨·D-day는
 * 예시 값이다.
 */
export function SceneFrame({
  deviceLabel = "A동 로비 1",
  position,
  children,
  className,
}: {
  deviceLabel?: string;
  /** 머리 줄 오른쪽. "이벤트 1 / 2" */
  position?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`@container ${className ?? ""}`}>
      <div
        role="img"
        aria-label="TV 화면 미리보기"
        className="flex aspect-video flex-col overflow-hidden rounded-control bg-stage text-hero-ink"
      >
        <div className="flex min-h-0 flex-1 flex-col gap-[1.5cqw] px-[4.2cqw] pt-[2.9cqw] pb-[1.7cqw]">
          <div className="flex h-[2.9cqw] items-center gap-[0.8cqw] text-[1.3cqw] font-extrabold">
            <LogoMark className="size-[2.4cqw]" />
            전단지
            <span className="ml-[0.4cqw] font-normal text-zinc-400">
              {deviceLabel}
            </span>
            {position && (
              <span className="ml-auto font-normal text-zinc-400">
                {position}
              </span>
            )}
          </div>
          <div className="min-h-0 flex-1">{children}</div>
        </div>
        <div className="flex h-[4.4cqw] flex-none items-center gap-[2.1cqw] bg-hero px-[2.5cqw] text-[1.35cqw]">
          <LiveClock
            format="time"
            className="text-[1.8cqw] font-extrabold text-hero-ink"
          />
          <span>맑음 14°</span>
          <span>종강 D-50</span>
        </div>
      </div>
    </div>
  );
}

/** 장면 카드: `#242428` 둥근 카드 안에 내용과 오른쪽 QR */
export function SceneCard({
  children,
  qr,
}: {
  children: ReactNode;
  qr?: ReactNode;
}) {
  return (
    <div className="flex h-full gap-[3.3cqw] rounded-[1.25cqw] bg-hero-raised px-[5cqw] py-[3.75cqw]">
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      {qr}
    </div>
  );
}

/** 카드 오른쪽 QR 자리. 240px(12.5cqw) 흰 칸과 아래 한 줄 */
export function SceneQr({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-none flex-col items-center justify-center gap-[1.25cqw]">
      <SceneQrCode value={value} />
      <p className="text-[2cqw] font-extrabold">{label}</p>
    </div>
  );
}

/** 실제로 스캔되는 QR. 여백(quiet zone)은 무늬에 들어 있다. 순수 흑백을 지킨다. */
function SceneQrCode({ value }: { value: string }) {
  const code = useMemo(() => {
    try {
      const matrix = encodeQrMatrix(value);
      return { path: toQrPathData(matrix), size: qrViewBoxSize(matrix) };
    } catch {
      return null;
    }
  }, [value]);
  return (
    <div className="size-[12.5cqw] rounded-[0.2cqw] bg-white">
      {code && (
        <svg
          viewBox={`0 0 ${code.size} ${code.size}`}
          className="size-full"
          aria-hidden="true"
          shapeRendering="crispEdges"
        >
          <path d={code.path} fill="#000000" />
        </svg>
      )}
    </div>
  );
}
