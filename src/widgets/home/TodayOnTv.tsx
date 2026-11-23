import { Link } from "react-router";
import { KIND_INFO, SUBMISSION_KINDS } from "@/entities/submission/model/kind";
import type { SubmissionView } from "@/entities/submission/model/types";
import { KIND_STYLE } from "@/entities/submission/ui/kind-style";
import { ProgressSplit } from "@/shared/components";
import { to } from "@/shared/config/routes";
import { cn } from "@/shared/lib/utils";

/**
 * 오늘 TV에서 시작하고 끝나는 콘텐츠. 하루를 내다본다.
 *
 * 둘 다 없으면 "없음" 두 줄 대신 한 줄로 줄인다.
 */
export function TodayStartsEnds({
  starts,
  ends,
  className,
}: {
  starts: SubmissionView[];
  ends: SubmissionView[];
  className?: string;
}) {
  if (starts.length === 0 && ends.length === 0) {
    return (
      <p className={cn("text-label text-ink-muted", className)}>
        오늘 시작·끝나는 콘텐츠 없음
      </p>
    );
  }
  return (
    <ul className={cn("flex flex-col gap-2.5 text-label", className)}>
      <Line
        tag="시작"
        tagClass="bg-success-subtle text-success-strong"
        items={starts}
      />
      <Line tag="끝" tagClass="bg-surface-muted text-ink-muted" items={ends} />
    </ul>
  );
}

/**
 * 운영자 홈의 "오늘 TV". 지금 걸린 콘텐츠의 종류 구성과 오늘 시작·끝나는 것.
 * 그룹 편성(9.3)이 들어오면 오늘 편성 흐름으로 바꾼다.
 */
export function TodayOnTv({
  published,
  starts,
  ends,
}: {
  published: SubmissionView[];
  starts: SubmissionView[];
  ends: SubmissionView[];
}) {
  const byKind = Object.fromEntries(
    SUBMISSION_KINDS.map((kind) => [
      kind,
      published.filter((item) => item.type === kind).length,
    ]),
  ) as Record<(typeof SUBMISSION_KINDS)[number], number>;

  return (
    <section
      aria-labelledby="today-on-tv"
      className="rounded-block bg-surface px-6 py-5.5 ring-1 ring-line"
    >
      <div className="flex items-baseline gap-2">
        <h2 id="today-on-tv" className="text-subhead text-ink">
          오늘 TV
        </h2>
        <span className="text-caption text-ink-subtle">
          지금 게시 중 {published.length}건
        </span>
        <Link
          to={to.contents()}
          className="ml-auto text-label font-semibold text-ink hover:underline"
        >
          전체 콘텐츠
        </Link>
      </div>
      <ProgressSplit
        className="mt-3.5 text-ink"
        parts={SUBMISSION_KINDS.map((kind) => ({
          key: kind,
          label: KIND_INFO[kind].short,
          value: byKind[kind],
          barClass: KIND_STYLE[kind].bar,
        }))}
      />
      <ul className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1 text-label text-ink-muted">
        {SUBMISSION_KINDS.map((kind) => (
          <li key={kind} className="inline-flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className={cn("size-2.5 rounded-[3px]", KIND_STYLE[kind].bar)}
            />
            {KIND_INFO[kind].short}
            <b className="text-ink tabular-nums">{byKind[kind]}</b>
          </li>
        ))}
      </ul>
      <TodayStartsEnds
        starts={starts}
        ends={ends}
        className="mt-4 border-t border-surface-muted pt-4"
      />
    </section>
  );
}

function Line({
  tag,
  tagClass,
  items,
}: {
  tag: string;
  tagClass: string;
  items: SubmissionView[];
}) {
  return (
    <li className="flex gap-2.5">
      <span
        className={`inline-flex h-5.5 shrink-0 items-center rounded-md px-2 text-overline font-extrabold ${tagClass}`}
      >
        {tag}
      </span>
      <span className="min-w-0 text-ink">
        {items.length === 0
          ? "없음"
          : items.map((item) => `〈${item.title}〉`).join(" · ")}
      </span>
    </li>
  );
}
