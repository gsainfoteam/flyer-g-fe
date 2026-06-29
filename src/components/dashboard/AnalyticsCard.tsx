import { TrendingUp } from "lucide-react";
import { weeklyViews } from "../../data/mockContents";

const W = 460;
const H = 150;
const PAD_X = 24;
const PAD_Y = 20;

export function AnalyticsCard() {
  const values = weeklyViews.map((d) => d.value);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = Math.max(1, max - min);

  const points = weeklyViews.map((d, i) => {
    const x = PAD_X + (i * (W - PAD_X * 2)) / (weeklyViews.length - 1);
    const y = PAD_Y + (H - PAD_Y * 2) * (1 - (d.value - min) / range);
    return { x, y, ...d };
  });

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${H - PAD_Y} L ${points[0].x.toFixed(1)} ${H - PAD_Y} Z`;
  const maxBar = Math.max(...values);

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm shadow-violet-100/40">
      <h2 className="text-base font-black text-gray-900">
        조회수 추이 <span className="text-xs font-bold text-gray-400">(최근 7일)</span>
      </h2>

      <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-center">
        <div className="min-w-0 flex-1">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="h-40 w-full"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="viewsArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[0.25, 0.5, 0.75].map((g) => (
              <line
                key={g}
                x1={PAD_X}
                x2={W - PAD_X}
                y1={PAD_Y + (H - PAD_Y * 2) * g}
                y2={PAD_Y + (H - PAD_Y * 2) * g}
                stroke="#F1EEFB"
                strokeWidth="1"
              />
            ))}
            <path d={areaPath} fill="url(#viewsArea)" />
            <path
              d={linePath}
              fill="none"
              stroke="#7C3AED"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {points.map((p) => (
              <circle
                key={p.label}
                cx={p.x}
                cy={p.y}
                r="3.5"
                fill="#fff"
                stroke="#7C3AED"
                strokeWidth="2.5"
              />
            ))}
          </svg>
          <div className="mt-1 flex justify-between px-5 text-[10px] font-bold text-gray-400">
            {weeklyViews.map((d) => (
              <span key={d.label}>{d.label}</span>
            ))}
          </div>
        </div>

        <div className="shrink-0 border-gray-100 lg:w-40 lg:border-l lg:pl-5">
          <p className="text-xs font-bold text-gray-400">총 조회수</p>
          <p className="mt-1 text-2xl font-black tracking-tight text-gray-900">
            12,530
          </p>
          <p className="mt-1 flex items-center gap-1 text-xs font-bold text-emerald-600">
            <TrendingUp className="size-3.5" />
            18%
            <span className="font-semibold text-gray-400">(지난 7일 대비)</span>
          </p>
          <div className="mt-4 flex h-12 items-end gap-1">
            {values.map((v, i) => (
              <div
                key={i}
                className="flex-1 rounded-t bg-violet-200"
                style={{ height: `${Math.max(20, (v / maxBar) * 100)}%` }}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
