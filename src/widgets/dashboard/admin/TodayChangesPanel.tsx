import { Link } from "react-router";
import { PREVIEW_DEVICE_ID } from "@/entities/playlist/model/types";
import { fromSubmissionView } from "@/entities/poster";
import { PosterThumb } from "@/entities/poster/ui/PosterThumb";
import type { SubmissionView } from "@/entities/submission/model/types";
import { EmptyState, Panel } from "@/shared/components";
import { to } from "@/shared/config/routes";
import {
  formatSeoulShortDateTime,
  getSeoulParts,
  seoulDayDiff,
} from "@/shared/lib/datetime";
import { josa } from "@/shared/lib/josa";
import { Button } from "@/shared/ui/button";

/**
 * 오늘 TV에 새로 걸리거나 내려가는 포스터. 게시판이 오늘 어떻게 바뀌는지 본다.
 *
 * 게시 중·예약 목록 하나로 가른다. 오늘 바뀌는 게 없으면 다음 변경이 언제인지 알린다.
 */
interface Change {
  submission: SubmissionView;
  at: Date;
  kind: "start" | "end";
}

function changesOf(submissions: SubmissionView[]): Change[] {
  return submissions.flatMap((submission): Change[] => [
    { submission, at: submission.startAt, kind: "start" },
    // 걸리지 않은 예약 건은 내려갈 일도 아직 없다.
    ...(submission.status === "PUBLISHED"
      ? [{ submission, at: submission.endAt, kind: "end" as const }]
      : []),
  ]);
}

const timeOf = (date: Date) => {
  const { hour24, minute } = getSeoulParts(date);
  return `${String(hour24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
};

export function TodayChangesPanel({
  submissions,
  now,
}: {
  /** 게시 중·예약 신청 */
  submissions: SubmissionView[];
  now: Date;
}) {
  const changes = changesOf(submissions).sort(
    (a, b) => a.at.getTime() - b.at.getTime(),
  );
  const today = changes.filter((change) => seoulDayDiff(now, change.at) === 0);
  const starting = today.filter((change) => change.kind === "start");
  const ending = today.filter((change) => change.kind === "end");
  const next = changes.find(
    (change) => seoulDayDiff(now, change.at) > 0,
  );

  return (
    <Panel
      title="오늘 바뀌는 것"
      action={
        <Button variant="link" size="xs" asChild>
          <Link to={to.display(PREVIEW_DEVICE_ID, { preview: true })}>
            TV 미리보기 →
          </Link>
        </Button>
      }
    >
      {today.length === 0 ? (
        <EmptyState
          title="오늘은 바뀌는 게 없어요"
          description={
            next
              ? `다음 변경은 ${formatSeoulShortDateTime(next.at)}, ${next.submission.title}${josa(next.submission.title, "이/가")} ${next.kind === "start" ? "걸려요" : "내려가요"}.`
              : "예정된 게시가 없어요."
          }
          className="py-1"
        />
      ) : (
        <div className="flex flex-col gap-3">
          <ChangeGroup label="걸림" tone="positive" changes={starting} />
          {starting.length > 0 && ending.length > 0 && (
            <hr className="border-line" />
          )}
          <ChangeGroup label="내려감" tone="neutral" changes={ending} />
        </div>
      )}
    </Panel>
  );
}

function ChangeGroup({
  label,
  tone,
  changes,
}: {
  label: string;
  tone: "positive" | "neutral";
  changes: Change[];
}) {
  if (changes.length === 0) return null;
  return (
    <section aria-label={label}>
      <h3
        className={
          tone === "positive"
            ? "text-caption font-bold text-success-strong"
            : "text-caption font-bold text-ink-muted"
        }
      >
        {label} {changes.length}
      </h3>
      <ul className="mt-2 flex flex-col gap-2.5">
        {changes.map(({ submission, at, kind }) => (
          <li
            key={`${submission.id}-${kind}`}
            className="flex items-center gap-2.5 text-label"
          >
            <PosterThumb poster={fromSubmissionView(submission)} size="xs" />
            <Link
              to={to.submissionDetail(submission.id)}
              className="min-w-0 flex-1 truncate font-semibold text-ink hover:underline"
            >
              {submission.title}
            </Link>
            <span className="shrink-0 text-caption text-ink-subtle tabular-nums">
              {timeOf(at)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
