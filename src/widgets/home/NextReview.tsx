import { ArrowRight, ChevronRight } from "lucide-react";
import { Link } from "react-router";
import { KIND_INFO, formatPeriod } from "@/entities/submission";
import type { SubmissionView } from "@/entities/submission/model/types";
import { KIND_STYLE } from "@/entities/submission/ui/kind-style";
import { to } from "@/shared/config/routes";
import { formatElapsed } from "@/shared/lib/datetime";
import { cn } from "@/shared/lib/utils";
import { LONG_WAIT_MS } from "./use-review-desk";

/**
 * 하우스 관리자 홈의 주인공: 다음에 심사할 건. 가장 오래 기다린 한 건을 포스터와 함께
 * 크게 두고, 옆 "그다음" 목록에 이어질 건을 차례로 둔다. 숫자 하나보다 지금 손댈 건이
 * 무엇인지가 먼저 보이게 한다.
 */
export function NextReview({
  item,
  now,
}: {
  item: SubmissionView | undefined;
  now: Date;
}) {
  if (!item) {
    return (
      <section
        aria-labelledby="next-review"
        className="flex min-w-0 flex-[999_1_560px] flex-col justify-center rounded-card bg-surface px-6 py-8 ring-1 ring-line"
      >
        <h2 id="next-review" className="text-subhead text-ink">
          기다리는 콘텐츠가 없어요
        </h2>
        <p className="mt-1 text-label text-ink-muted">
          새 신청이 들어오면 여기에 먼저 보여요.
        </p>
      </section>
    );
  }

  const since = item.submittedAt ?? item.createdAt;
  const late = now.getTime() - since.getTime() > LONG_WAIT_MS;
  const style = KIND_STYLE[item.type];
  const Icon = style.icon;

  return (
    <section
      aria-labelledby="next-review"
      className="flex min-w-0 flex-[999_1_560px] overflow-hidden rounded-card bg-surface shadow-card ring-1 ring-line"
    >
      <div
        aria-hidden="true"
        className="hidden w-56 shrink-0 items-center justify-center bg-surface-muted p-6 sm:flex"
      >
        {item.posterUrl ? (
          <img
            src={item.posterUrl}
            alt=""
            className="aspect-3/4 w-full rounded-md bg-surface object-cover shadow-card"
          />
        ) : (
          <span
            className={cn(
              "flex aspect-3/4 w-full items-center justify-center rounded-md",
              style.soft,
            )}
          >
            <Icon size={32} strokeWidth={1.75} />
          </span>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2.5 px-6 py-5">
        <p className="text-caption text-ink-subtle">
          다음 차례 ·{" "}
          <span className={cn(late && "font-semibold text-accent-700")}>
            {formatElapsed(since, now)}째 기다림
          </span>
        </p>
        <h2
          id="next-review"
          className="text-[19px] leading-snug font-extrabold tracking-[-0.02em] text-ink"
        >
          {item.title}
        </h2>
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-label">
          <dt className="text-ink-subtle">종류</dt>
          <dd className="text-ink">{KIND_INFO[item.type].name}</dd>
          <dt className="text-ink-subtle">올린 사람</dt>
          <dd className="text-ink">{item.requesterName ?? "작성자 가림"}</dd>
          <dt className="text-ink-subtle">게시 기간</dt>
          <dd className="text-ink">{formatPeriod(item)}</dd>
        </dl>
        <div className="mt-auto pt-2">
          <Link
            to={to.reviewDetail(item.id)}
            className="inline-flex h-10 items-center gap-1.5 rounded-control bg-accent px-4 text-label font-bold text-accent-on transition-colors hover:bg-accent-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            심사 시작
            <ArrowRight size={15} strokeWidth={2.4} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/** 다음 차례 다음으로 이어질 건. 누르면 그 건의 심사 화면으로 간다. */
export function UpNext({
  items,
  now,
}: {
  items: SubmissionView[];
  now: Date;
}) {
  return (
    <section
      aria-labelledby="up-next"
      className="min-w-0 flex-[1_1_300px] overflow-hidden rounded-card bg-surface ring-1 ring-line"
    >
      <div className="flex items-center border-b border-line px-5 py-3.5">
        <h2 id="up-next" className="text-subhead text-ink">
          그다음
        </h2>
        <Link
          to={to.review()}
          className="ml-auto inline-flex items-center text-label text-ink-muted hover:text-ink"
        >
          모두 보기
          <ChevronRight size={15} aria-hidden="true" />
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="px-5 py-4 text-label text-ink-muted">이어질 건 없음</p>
      ) : (
        <ol>
          {items.map((item, index) => {
            const since = item.submittedAt ?? item.createdAt;
            const late = now.getTime() - since.getTime() > LONG_WAIT_MS;
            return (
              <li key={item.id} className="border-t border-surface-muted first:border-t-0">
                <Link
                  to={to.reviewDetail(item.id)}
                  className="flex items-center gap-3 px-5 py-2.75 transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
                >
                  <span className="w-3.5 text-caption text-ink-subtle tabular-nums">
                    {index + 2}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-semibold text-ink">
                    {item.title}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 text-label",
                      late ? "text-accent-700" : "text-ink-muted",
                    )}
                  >
                    {formatElapsed(since, now)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
