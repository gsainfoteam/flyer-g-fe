import type { SubmissionView } from "@/entities/submission/model/types";

/** 오늘 TV에서 시작하고 끝나는 컨텐츠. 하우스 관리자가 하루를 내다본다. */
export function TodayOnTv({
  starts,
  ends,
}: {
  starts: SubmissionView[];
  ends: SubmissionView[];
}) {
  return (
    <section
      aria-labelledby="today-on-tv"
      className="rounded-block bg-surface px-6 py-5.5 ring-1 ring-line"
    >
      <h2 id="today-on-tv" className="text-subhead text-ink">
        오늘 TV에서
      </h2>
      <ul className="mt-3 flex flex-col gap-2.5 text-label">
        <Line tag="시작" tagClass="bg-success-subtle text-success-strong" items={starts} />
        <Line tag="끝" tagClass="bg-surface-muted text-ink-muted" items={ends} />
      </ul>
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
