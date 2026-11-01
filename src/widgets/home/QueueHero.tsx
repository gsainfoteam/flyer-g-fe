import { ArrowRight, Clock } from "lucide-react";
import { Link } from "react-router";
import { KIND_INFO, SUBMISSION_KINDS } from "@/entities/submission/model/kind";
import type { SubmissionKind } from "@/entities/submission/model/kind";
import { KIND_STYLE } from "@/entities/submission/ui/kind-style";
import { HeroPanel, ProgressSplit } from "@/shared/components";
import { to } from "@/shared/config/routes";
import { formatElapsed } from "@/shared/lib/datetime";
import { cn } from "@/shared/lib/utils";

/**
 * 심사 대기 건수. 하우스 관리자가 홈에 온 이유라 가장 크게 둔다. (기획 4-0)
 *
 * 종류 구성은 서버의 종류별 건수(배포 ②)가 오기 전까지 모두 포스터로 센다.
 */
export interface QueueNumbers {
  total: number;
  byKind: Record<SubmissionKind, number>;
  /** 가장 오래 기다린 건이 낸 시각. 대기가 없으면 null */
  oldestSubmittedAt: Date | null;
  now: Date;
}

export function QueueHero({ queue }: { queue: QueueNumbers }) {
  return (
    <HeroPanel labelledBy="queue-title" className="flex-[999_1_600px]">
      <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
        <div>
          <h1 id="queue-title" className="text-body font-bold text-hero-muted">
            심사 대기
          </h1>
          <p className="text-[4.5rem] leading-none font-black tracking-[-0.05em] tabular-nums">
            {queue.total}
            <span className="ml-1 text-[1.75rem] font-bold tracking-normal">건</span>
          </p>
        </div>
        {queue.oldestSubmittedAt && (
          <span className="inline-flex h-8.5 items-center gap-2 rounded-pill bg-accent/20 px-3.5 text-label font-bold text-accent-300">
            <Clock size={16} aria-hidden="true" />
            가장 오래 {formatElapsed(queue.oldestSubmittedAt, queue.now)}
          </span>
        )}
        <Link
          to={to.review()}
          className="inline-flex h-13 items-center gap-2.5 rounded-[0.875rem] bg-accent px-6 text-body font-extrabold text-accent-on transition-colors hover:bg-accent-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:ml-auto"
        >
          {queue.total > 0 ? "오래된 것부터 심사" : "심사 화면 열기"}
          <ArrowRight size={18} strokeWidth={2.5} aria-hidden="true" />
        </Link>
      </div>
      <KindSplit byKind={queue.byKind} className="mt-6" onDark />
    </HeroPanel>
  );
}

/** 심사 대기 작은 칸. 운영자 홈 옆 칸에 둔다(운영자도 심사한다). */
export function QueueCard({ queue }: { queue: QueueNumbers }) {
  return (
    <section
      aria-labelledby="queue-card"
      className="rounded-block bg-surface px-6 py-5.5 ring-1 ring-line"
    >
      <h2 id="queue-card" className="text-label font-bold text-ink-muted">
        심사 대기
      </h2>
      <p className="text-[2.75rem] leading-[1.1] font-black tracking-[-0.04em] tabular-nums">
        {queue.total}
        <span className="text-[1.125rem] font-bold tracking-normal">건</span>
      </p>
      <KindSplit byKind={queue.byKind} className="mt-3" />
      <Link
        to={to.review()}
        className="mt-3.5 flex h-11 items-center justify-center gap-2 rounded-tile bg-ink text-label font-extrabold text-ink-inverse transition-colors hover:bg-ink/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        {queue.total > 0 ? "오래된 것부터 심사" : "심사 화면 열기"}
        <ArrowRight size={16} strokeWidth={2.5} aria-hidden="true" />
      </Link>
    </section>
  );
}

function KindSplit({
  byKind,
  className,
  onDark = false,
}: {
  byKind: Record<SubmissionKind, number>;
  className?: string;
  onDark?: boolean;
}) {
  return (
    <div className={className}>
      <ProgressSplit
        thick={onDark}
        className={onDark ? "text-hero-ink" : "text-ink"}
        parts={SUBMISSION_KINDS.map((kind) => ({
          key: kind,
          label: KIND_INFO[kind].short,
          value: byKind[kind],
          barClass: KIND_STYLE[kind].bar,
        }))}
      />
      <ul
        className={cn(
          "mt-3 flex flex-wrap gap-x-5 gap-y-1 text-label",
          onDark ? "text-zinc-300" : "text-ink-muted",
        )}
      >
        {SUBMISSION_KINDS.map((kind) => (
          <li key={kind} className="inline-flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className={cn("size-2.5 rounded-[3px]", KIND_STYLE[kind].bar)}
            />
            {KIND_INFO[kind].short}
            <b className={cn("tabular-nums", onDark ? "text-white" : "text-ink")}>
              {byKind[kind]}
            </b>
          </li>
        ))}
      </ul>
    </div>
  );
}
