import type { ReactNode } from "react";
import { Link } from "react-router";
import type {
  SubmissionEvent,
  SubmissionEventType,
} from "@/entities/review/model/types";
import type { SubmissionView } from "@/entities/submission/model/types";
import { useReviewHistories } from "@/features/submissions/api/queries";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  Panel,
} from "@/shared/components";
import { to } from "@/shared/config/routes";
import { formatSeoulDayTime } from "@/shared/lib/datetime";
import { cn } from "@/shared/lib/utils";

/**
 * 게시자 홈의 "최근 소식". 내 신청에 일어난 일을 최신순으로 한 줄씩. 기록이라
 * "제목 + 일" 명사형으로 짧게 쓴다.
 *
 * 홈에 다시 왔을 때 "그사이 무엇이 바뀌었나"에 답한다. 반려·중단에는 관리자가 남긴
 * 사유를 그대로 붙인다. 최근에 움직인 신청 몇 건의 이력만 모은다 — 게시자는 신청이
 * 많지 않고, 오래전 일은 홈에서 볼 필요가 없다.
 */
const TRACKED_SUBMISSIONS = 5;
const SHOWN_EVENTS = 6;

/** 신청이 마지막으로 움직였을 법한 때. 목록에 수정 시각이 없어 기간으로 가늠한다. */
function lastActivityOf(submission: SubmissionView, now: Date): number {
  return Math.max(
    (submission.submittedAt ?? submission.createdAt).getTime(),
    ...[submission.startAt, submission.endAt]
      .map((date) => date.getTime())
      .filter((time) => time <= now.getTime()),
  );
}

export function ActivityFeedPanel({
  submissions,
  now,
}: {
  submissions: SubmissionView[];
  now: Date;
}) {
  const tracked = [...submissions]
    .sort((a, b) => lastActivityOf(b, now) - lastActivityOf(a, now))
    .slice(0, TRACKED_SUBMISSIONS);
  const titles = new Map(tracked.map((item) => [item.id, item.title]));
  const histories = useReviewHistories(tracked.map((item) => item.id));

  const pending = histories.some((query) => query.isPending);
  const failed = histories.find((query) => query.error);
  const events = histories
    .flatMap((query) => query.data ?? [])
    // 서버 시각보다 뒤의 일은 아직 일어나지 않았다.
    .filter((event) => event.occurredAt.getTime() <= now.getTime())
    .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
    .slice(0, SHOWN_EVENTS);

  return (
    <Panel title="최근 소식">
      {pending ? (
        <LoadingState rows={3} label="소식을 불러오고 있어요." />
      ) : failed ? (
        <ErrorState
          error={failed.error}
          title="소식을 불러오지 못했어요"
          onRetry={() =>
            histories.forEach((query) => {
              if (query.error) void query.refetch();
            })
          }
          className="py-0"
        />
      ) : events.length === 0 ? (
        <EmptyState
          title="아직 소식이 없어요"
          description="신청하면 검토 결과와 게시 시작·종료 소식이 여기에 쌓여요."
          className="py-1"
        />
      ) : (
        <ol className="flex flex-col">
          {events.map((event, index) => (
            <FeedItem
              key={event.id}
              event={event}
              title={titles.get(event.submissionId) ?? "신청"}
              now={now}
              last={index === events.length - 1}
            />
          ))}
        </ol>
      )}
    </Panel>
  );
}

const dotClass: Record<SubmissionEventType, string> = {
  SUBMITTED: "border-ink",
  RESUBMITTED: "border-ink-subtle",
  APPROVED: "border-success",
  PUBLISHED: "border-success",
  REJECTED: "border-accent",
  SUSPENDED: "border-accent",
  CANCELED: "border-ink-subtle",
  ENDED: "border-ink-subtle",
};

function FeedItem({
  event,
  title,
  now,
  last,
}: {
  event: SubmissionEvent;
  title: string;
  now: Date;
  last: boolean;
}) {
  const name = (
    <Link
      to={to.submissionDetail(event.submissionId)}
      className="font-bold hover:underline"
    >
      {title}
    </Link>
  );
  const quote =
    (event.type === "REJECTED" || event.type === "SUSPENDED") && event.comment;

  return (
    <li className="flex gap-3">
      <div className="relative flex w-2.5 shrink-0 justify-center">
        {!last && (
          <span
            aria-hidden="true"
            className="absolute top-3 -bottom-1 w-px bg-line"
          />
        )}
        <span
          aria-hidden="true"
          className={cn(
            "relative mt-1.5 size-2.5 rounded-pill border-2 bg-surface",
            dotClass[event.type],
          )}
        />
      </div>
      <div className={cn("min-w-0 flex-1", !last && "pb-4")}>
        <p className="text-caption text-ink-subtle tabular-nums">
          {formatSeoulDayTime(event.occurredAt, now)}
        </p>
        <p className="mt-0.5 text-label font-normal text-ink">
          {sentenceOf(event.type, name)}
        </p>
        {quote && (
          <p className="mt-1 text-caption text-ink-muted">“{quote}”</p>
        )}
      </div>
    </li>
  );
}

function sentenceOf(type: SubmissionEventType, name: ReactNode): ReactNode {
  switch (type) {
    case "SUBMITTED":
      return <>{name} 신청</>;
    case "RESUBMITTED":
      return <>{name} 수정 후 다시 제출</>;
    case "APPROVED":
      return (
        <>
          {name} <span className="font-bold text-success-strong">승인</span>
        </>
      );
    case "REJECTED":
      return (
        <>
          {name} <span className="font-bold text-attention-strong">반려</span>
        </>
      );
    case "SUSPENDED":
      return (
        <>
          {name}{" "}
          <span className="font-bold text-attention-strong">게시 중단</span>
        </>
      );
    case "CANCELED":
      return <>{name} 신청 취소</>;
    case "PUBLISHED":
      return <>{name} 게시 시작</>;
    case "ENDED":
      return <>{name} 게시 종료</>;
  }
}
