interface QRCodeBoxProps {
  value: string;
  label?: string;
  size?: "sm" | "md" | "lg" | "xl";
  inverse?: boolean;
}

const sizeClassName = {
  sm: "size-12",
  md: "size-20",
  lg: "size-28",
  xl: "size-36",
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
        className={`${sizeClassName[size]} rounded-xl ${
          inverse ? "bg-white" : "bg-white"
        } p-1.5 shadow-sm ring-1 ring-black/5`}
        aria-label={`QR 코드 ${value}`}
      >
        <div
          className="grid h-full w-full"
          style={{ gridTemplateColumns: `repeat(${GRID}, 1fr)` }}
        >
          {cells.map((filled, index) => (
            <span
              key={index}
              className={filled ? "bg-gray-950" : "bg-transparent"}
            />
          ))}
        </div>
      </div>
      {label && (
        <span
          className={`text-[11px] font-bold ${
            inverse ? "text-white/80" : "text-gray-500"
          }`}
        >
          {label}
        </span>
      )}
    </div>
  );
}
