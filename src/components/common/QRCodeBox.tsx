import { useMemo } from "react";
import { cn } from "@/shared/lib/utils";
import {
  DEFAULT_QR_ERROR_CORRECTION,
  encodeQrMatrix,
  qrViewBoxSize,
  toQrPathData,
} from "@/shared/lib/qr";
import type { QrErrorCorrectionLevel } from "@/shared/lib/qr";

/**
 * 실제로 스캔되는 QR.
 *
 * `value`에는 반드시 신청의 `detailUrl`을 넘긴다. QR 값의 단일 원천이다.
 * (명세 FR-PLY-05, 12.2)
 *
 * 값이 아직 없거나 인코딩할 수 없으면 가짜 무늬 대신 빈 자리를 밝힌다.
 * 스캔되지 않는 그림을 QR처럼 보여주면 TV 앞에서 확인할 방법이 없다.
 */
interface QRCodeBoxProps {
  value: string;
  label?: string;
  size?: keyof typeof sizeClassName;
  inverse?: boolean;
  errorCorrectionLevel?: QrErrorCorrectionLevel;
}

const sizeClassName = {
  sm: "size-12",
  md: "size-20",
  /** TV 4분할 슬롯 */
  lg: "size-[108px]",
  /** TV 단일 레이아웃. 5m 거리에서 스캔 가능한 크기 */
  tv: "size-[216px]",
};

export function QRCodeBox({
  value,
  label,
  size = "md",
  inverse = false,
  errorCorrectionLevel = DEFAULT_QR_ERROR_CORRECTION,
}: QRCodeBoxProps) {
  const code = useMemo(() => {
    if (value.length === 0) return null;
    try {
      const matrix = encodeQrMatrix(value, errorCorrectionLevel);
      return {
        pathData: toQrPathData(matrix),
        viewBoxSize: qrViewBoxSize(matrix),
      };
    } catch {
      return null;
    }
  }, [value, errorCorrectionLevel]);

  return (
    <div className="inline-flex flex-col items-center gap-2">
      {code ? (
        <svg
          className={cn(sizeClassName[size], "rounded-sm bg-white ring-1 ring-line")}
          viewBox={`0 0 ${code.viewBoxSize} ${code.viewBoxSize}`}
          role="img"
          aria-label={`QR 코드: ${value}`}
          shapeRendering="crispEdges"
        >
          {/* QR은 디자인 토큰이 아니라 스캔 대비를 따른다. 순수 흑백을 유지한다. */}
          <path d={code.pathData} fill="#000000" />
        </svg>
      ) : (
        <div
          className={cn(
            sizeClassName[size],
            "grid place-items-center rounded-sm border border-dashed border-line-strong bg-surface-muted text-center",
          )}
          role="img"
          aria-label="QR 코드 없음. 상세 링크를 입력하면 생성됩니다."
        >
          <span className="px-1 text-[10px] leading-tight text-ink-subtle">
            링크 입력 후
            <br />
            생성
          </span>
        </div>
      )}
      {label && (
        <span
          className={cn(
            "text-caption font-bold",
            inverse ? "text-white/80" : "text-ink-muted",
          )}
        >
          {label}
        </span>
      )}
    </div>
  );
}
