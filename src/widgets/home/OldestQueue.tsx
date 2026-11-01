import { Link } from "react-router";
import { KIND_INFO, kindOfSubmission } from "@/entities/submission/model/kind";
import type { SubmissionView } from "@/entities/submission/model/types";
import { TypeIcon } from "@/entities/submission/ui/TypeIcon";
import { to } from "@/shared/config/routes";
import { formatElapsed } from "@/shared/lib/datetime";
import { cn } from "@/shared/lib/utils";

/** 24시간을 넘기면 오래 기다린 것으로 짚는다(운영자 "확인할 것"과 같은 기준). */
export const LONG_WAIT_MS = 24 * 60 * 60 * 1000;

/** 오래 기다린 순 다섯 건. 누르면 그 건의 심사 화면으로 간다. */
export function OldestQueue({
  items,
  now,
}: {
  items: SubmissionView[];
  now: Date;
}) {
  return (
    <section
      aria-labelledby="oldest-queue"
      className="flex-[999_1_600px] min-w-0 rounded-block bg-surface py-2 ring-1 ring-line"
    >
      <div className="flex items-baseline px-6 pt-3.5 pb-2">
        <h2 id="oldest-queue" className="text-subhead text-ink">
          오래 기다린 순
        </h2>
        <Link
          to={to.review()}
          className="ml-auto text-label font-semibold text-ink hover:underline"
        >
          모두 보기
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="px-6 pt-1 pb-4 text-label text-ink-muted">
          기다리는 컨텐츠 없음
        </p>
      ) : (
        <ul>
          {items.map((item) => {
            const since = item.submittedAt ?? item.createdAt;
            const old = now.getTime() - since.getTime() > LONG_WAIT_MS;
            const kind = kindOfSubmission(item);
            return (
              <li key={item.id} className="border-t border-surface-muted">
                <Link
                  to={to.reviewDetail(item.id)}
                  className="flex items-center gap-3.5 px-6 py-3 transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
                >
                  <TypeIcon kind={kind} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-ink">{item.title}</p>
                    <p className="text-caption text-ink-subtle">
                      {KIND_INFO[kind].short} · {item.requesterName}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "inline-flex h-7 shrink-0 items-center rounded-pill px-2.5 text-caption font-bold whitespace-nowrap",
                      old
                        ? "bg-accent-100 text-accent-700"
                        : "bg-surface-muted text-ink-muted",
                    )}
                  >
                    {formatElapsed(since, now)}
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
