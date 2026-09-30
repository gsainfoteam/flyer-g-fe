import type { ReactNode } from "react";
import { Link } from "react-router";
import { useTargetGroupLabel } from "@/entities/device/api/queries";
import type { ImpressionStatsItem } from "@/entities/impression/model/types";
import { PREVIEW_DEVICE_ID } from "@/entities/playlist/model/types";
import { fromSubmissionView } from "@/entities/poster";
import { PosterThumb } from "@/entities/poster/ui/PosterThumb";
import { canSubmitterEdit } from "@/entities/submission";
import type { SubmissionView } from "@/entities/submission/model/types";
import { SubmissionProgress } from "@/entities/submission/ui/SubmissionProgress";
import { useReviewHistory } from "@/features/submissions/api/queries";
import { to } from "@/shared/config/routes";
import {
  formatElapsed,
  formatSeoulShortDate,
  formatSeoulShortDateTime,
  seoulDayDiff,
} from "@/shared/lib/datetime";
import { Button } from "@/shared/ui/button";

/**
 * 게시자의 진행 중인 신청 한 건.
 *
 * 게시자는 신청이 몇 건 없다. 그래서 목록의 한 줄 대신 카드 한 장에 필요한 걸 다
 * 둔다 — 지금 몇 단계인지, 다음에 언제 무슨 일이 일어나는지, 어디에 걸리고 QR이
 * 어디로 가는지, 걸려 있다면 몇 번 나왔는지.
 *
 * 반려·중단 건은 관리자가 남긴 사유를 그대로 보여주고 고치러 가는 버튼을 둔다.
 */
const DAY_MS = 24 * 60 * 60 * 1000;

interface ActiveSubmissionCardProps {
  submission: SubmissionView;
  /** 이 게시물의 노출. 기간 안에 노출이 없으면 없다. */
  impressions: ImpressionStatsItem | undefined;
  /** 서버 시각 */
  now: Date;
}

export function ActiveSubmissionCard({
  submission,
  impressions,
  now,
}: ActiveSubmissionCardProps) {
  const needsFix =
    submission.status === "REJECTED" || submission.status === "SUSPENDED";
  const places = useTargetGroupLabel(submission.targetGroupIds);
  const detailHref = to.submissionDetail(submission.id);
  const wished =
    submission.status === "PENDING_REVIEW" || submission.status === "REJECTED";

  return (
    <li className="flex gap-4 border-b border-line p-5 last:border-b-0 sm:gap-5">
      <Link
        to={detailHref}
        tabIndex={-1}
        aria-hidden="true"
        className="self-start"
      >
        <PosterThumb
          poster={fromSubmissionView(submission)}
          size="card"
          className="max-sm:w-16"
        />
      </Link>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h3 className="min-w-0 text-subhead text-ink">
            <Link to={detailHref} className="hover:underline">
              {submission.title}
            </Link>
          </h3>
          {!needsFix && (
            <Button variant="link" size="xs" asChild>
              {submission.status === "PUBLISHED" ? (
                <Link to={to.display(PREVIEW_DEVICE_ID, { preview: true })}>
                  TV 화면으로 보기 →
                </Link>
              ) : (
                <Link to={detailHref}>신청 내용 보기 →</Link>
              )}
            </Button>
          )}
        </div>
        <p className="mt-0.5 text-caption text-ink-subtle">
          {[
            submission.categoryName,
            submission.organizerName,
            `${formatSeoulShortDate(submission.startAt)} ~ ${formatSeoulShortDate(submission.endAt)}${wished ? " 희망" : ""}`,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>

        <SubmissionProgress status={submission.status} className="mt-3" />

        <p className="mt-3 text-label font-normal text-ink">
          {sentenceOf(submission, now)}
        </p>

        {needsFix && <FixRequest submission={submission} />}

        <dl className="mt-3.5 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 border-t border-line/70 pt-3 text-caption">
          {impressionLine(submission, impressions, now)}
          {places !== null && (
            <MetaRow label="걸리는 곳">{places}</MetaRow>
          )}
          <MetaRow label="QR 연결">
            {submission.detailUrl ? (
              <a
                href={submission.detailUrl}
                target="_blank"
                rel="noreferrer"
                className="font-semibold break-all underline decoration-line-strong underline-offset-2 hover:decoration-ink"
              >
                {submission.detailUrl.replace(/^https?:\/\//, "")}
              </a>
            ) : (
              "QR 없이 게시해요"
            )}
          </MetaRow>
        </dl>
      </div>
    </li>
  );
}

function MetaRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-ink-subtle">{label}</dt>
      <dd className="min-w-0 text-ink">{children}</dd>
    </>
  );
}

/** 지금 상황과 다음에 일어날 일을 한 문장으로. */
function sentenceOf(submission: SubmissionView, now: Date): ReactNode {
  switch (submission.status) {
    case "PUBLISHED": {
      const left = seoulDayDiff(now, submission.endAt);
      return (
        <>
          TV에 걸려 있어요.{" "}
          <strong>{formatSeoulShortDateTime(submission.endAt)}</strong>에
          알아서 내려가요.{" "}
          {left <= 0 ? "오늘이 마지막 날이에요." : `${left}일 남았어요.`}
        </>
      );
    }
    case "APPROVED":
    case "SCHEDULED":
      return (
        <>
          승인됐어요.{" "}
          <strong>{formatSeoulShortDateTime(submission.startAt)}</strong>에
          자동으로 걸려요.
        </>
      );
    case "PENDING_REVIEW": {
      const waited = formatElapsed(
        submission.submittedAt ?? submission.createdAt,
        now,
      );
      return submission.startAt.getTime() > now.getTime() ? (
        <>
          관리자 검토를 기다린 지 {waited}째예요. 승인되면{" "}
          {formatSeoulShortDateTime(submission.startAt)}에 자동으로 걸려요.
        </>
      ) : (
        `관리자 검토를 기다린 지 ${waited}째예요. 승인되면 바로 걸려요.`
      );
    }
    case "REJECTED":
      return "관리자가 반려했어요. 사유를 보고 고쳐서 다시 낼 수 있어요.";
    case "SUSPENDED":
      return "관리자가 게시를 중단했어요. 고쳐서 다시 내면 다시 검토해요.";
    default:
      return null;
  }
}

/** 걸린 적이 있으면 몇 번 나왔는지. 걸리기 전에는 줄을 두지 않는다. */
function impressionLine(
  submission: SubmissionView,
  impressions: ImpressionStatsItem | undefined,
  now: Date,
): ReactNode {
  const onAir = submission.status === "PUBLISHED";
  if (!impressions) {
    return onAir ? (
      <MetaRow label="TV에 나온 횟수">아직 모으는 중이에요</MetaRow>
    ) : null;
  }
  const parts = [`${impressions.impressions.toLocaleString("ko-KR")}회`];
  if (onAir) {
    const days = Math.max(
      1,
      (now.getTime() - submission.startAt.getTime()) / DAY_MS,
    );
    parts.push(
      `하루 평균 약 ${Math.round(impressions.impressions / days).toLocaleString("ko-KR")}회`,
    );
  }
  parts.push(`TV ${impressions.deviceCount}대`);
  return (
    <MetaRow label="TV에 나온 횟수">
      <span className="font-semibold tabular-nums">{parts[0]}</span>
      {parts.slice(1).map((part) => ` · ${part}`)}
    </MetaRow>
  );
}

/** 반려·중단 사유와 고치러 가는 버튼. 사유는 처리 이력의 마지막 결정에서 온다. */
function FixRequest({ submission }: { submission: SubmissionView }) {
  const history = useReviewHistory(submission.id);
  const decision = history.data
    ?.filter(
      (event) => event.type === "REJECTED" || event.type === "SUSPENDED",
    )
    .at(-1);

  return (
    <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
      {decision?.comment ? (
        <blockquote className="min-w-0 flex-1 rounded-control border border-accent-200 bg-surface px-3.5 py-2.5 max-sm:basis-full">
          <p className="text-caption font-bold text-attention-strong">
            {submission.status === "REJECTED" ? "반려 사유" : "중단 사유"} ·{" "}
            {decision.actorName}
          </p>
          <p className="mt-0.5 text-label font-normal text-ink">
            “{decision.comment}”
          </p>
        </blockquote>
      ) : (
        <span className="flex-1" />
      )}
      {canSubmitterEdit(submission.status) && (
        <Button size="sm" asChild>
          <Link to={to.studioEdit(submission.id)}>고쳐서 다시 내기</Link>
        </Button>
      )}
    </div>
  );
}
