import { ChevronRight, Clock, WifiOff } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link } from "react-router";
import { IconTile } from "@/shared/components";
import { cn } from "@/shared/lib/utils";

/**
 * 운영자 홈 맨 위 "확인할 것". 줄마다 바로 가는 행동이 있다. (기획 4-0)
 *
 * 꺼진 TV, 24시간 넘은 심사를 모은다. 수집 실패는 수집기(9.6)가 생기면 더한다.
 * 없으면 "확인할 것 없음" 한 줄만 둔다.
 */
export interface CheckItem {
  key: string;
  kind: "device" | "wait";
  title: string;
  detail: string;
  action: string;
  href: string;
}

const KIND: Record<CheckItem["kind"], { icon: LucideIcon; tone: string; action: string }> = {
  device: {
    icon: WifiOff,
    tone: "bg-accent-100 text-accent-700",
    action: "text-accent-700",
  },
  wait: {
    icon: Clock,
    tone: "bg-warning-subtle text-warning-strong",
    action: "text-warning-strong",
  },
};

export function ChecksToDo({ items }: { items: CheckItem[] }) {
  return (
    <section aria-labelledby="checks" className="flex flex-col gap-2.5">
      <h2
        id="checks"
        className="flex items-center gap-2 text-body font-extrabold text-ink"
      >
        확인할 것
        {items.length > 0 && (
          <span className="inline-flex h-5.5 min-w-5.5 items-center justify-center rounded-pill bg-accent px-1.75 text-overline text-accent-on">
            {items.length}
          </span>
        )}
      </h2>
      {items.length === 0 ? (
        <p className="rounded-block bg-surface px-5 py-4 text-label text-ink-muted ring-1 ring-line">
          확인할 것 없음 · TV와 심사 모두 정상
        </p>
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-3">
          {items.map((item) => {
            const kind = KIND[item.kind];
            return (
              <li key={item.key}>
                <Link
                  to={item.href}
                  className="flex items-center gap-3.5 rounded-card bg-surface px-4.5 py-4 ring-1 ring-line transition-shadow hover:shadow-floating focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                >
                  <IconTile icon={kind.icon} size="md" className={kind.tone} />
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-ink">{item.title}</b>
                    <span className="text-caption text-ink-muted">
                      {item.detail}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "inline-flex shrink-0 items-center text-caption font-bold",
                      kind.action,
                    )}
                  >
                    {item.action}
                    <ChevronRight size={14} aria-hidden="true" />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
