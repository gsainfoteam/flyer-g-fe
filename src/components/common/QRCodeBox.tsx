/**
 * 주의: 실제 QR이 아니라 시드 기반 패턴 자리표시자다. 스캔되지 않는다.
 * 실제 QR 생성은 Phase 02(미리보기)와 Phase 05(플레이어)에서 도입한다.
 * (명세 FR-PLY-05, 12.2)
 *
 * `value`에는 반드시 신청의 `detailUrl`을 넘긴다. QR 값의 단일 원천이다.
 */
interface QRCodeBoxProps {
  value: string;
  label?: string;
  size?: keyof typeof sizeClassName;
  inverse?: boolean;
}

const sizeClassName = {
  sm: "size-12",
  md: "size-20",
  /** TV 4분할 슬롯 */
  lg: "size-[108px]",
  /** TV 단일 레이아웃. 5m 거리에서 스캔 가능한 크기 */
  tv: "size-[216px]",
};

const GRID = 25;

function isFinder(row: number, col: number) {
  const inBox = (r0: number, c0: number) =>
    row >= r0 &&
    row < r0 + 7 &&
    col >= c0 &&
    col < c0 + 7 &&
    (row === r0 ||
      row === r0 + 6 ||
      col === c0 ||
      col === c0 + 6 ||
      (row >= r0 + 2 && row <= r0 + 4 && col >= c0 + 2 && col <= c0 + 4));
  return inBox(0, 0) || inBox(0, GRID - 7) || inBox(GRID - 7, 0);
}

function isFinderArea(row: number, col: number) {
  const inArea = (r0: number, c0: number) =>
    row >= r0 && row < r0 + 8 && col >= c0 && col < c0 + 8;
  return (
    inArea(0, 0) || inArea(0, GRID - 8) || inArea(GRID - 8, 0)
  );
}

export function QRCodeBox({
  value,
  label,
  size = "md",
  inverse = false,
}: QRCodeBoxProps) {
  let seed = 0;
  for (let i = 0; i < value.length; i++) {
    seed = (seed * 31 + value.charCodeAt(i)) % 2147483647;
  }

  const cells: boolean[] = [];
  for (let row = 0; row < GRID; row++) {
    for (let col = 0; col < GRID; col++) {
      if (isFinder(row, col)) {
        cells.push(true);
      } else if (isFinderArea(row, col)) {
        cells.push(false);
      } else {
        seed = (seed * 1103515245 + 12345) % 2147483647;
        cells.push(((seed >> 8) & 1) === 1);
      }
    }
  }

  return (
    <div className="inline-flex flex-col items-center gap-2">
      <div
        className={`${sizeClassName[size]} rounded-sm bg-white p-1.5 ring-1 ring-line`}
        aria-label={`QR 코드 자리표시자: ${value}`}
      >
        <div
          className="grid h-full w-full"
          style={{ gridTemplateColumns: `repeat(${GRID}, 1fr)` }}
        >
          {cells.map((filled, index) => (
            <span
              key={index}
              className={filled ? "bg-ink" : "bg-transparent"}
            />
          ))}
        </div>
      </div>
      {label && (
        <span
          className={`text-caption font-bold ${
            inverse ? "text-white/80" : "text-ink-muted"
          }`}
        >
          {label}
        </span>
      )}
    </div>
  );
}
