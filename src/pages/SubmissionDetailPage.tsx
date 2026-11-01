import { ExternalLink } from "lucide-react";
import { Link, useParams } from "react-router";
import { useTargetGroupLabel } from "@/entities/device/api/queries";
import { fromSubmissionView } from "@/entities/poster";
import { getRejectionReasonLabel } from "@/entities/review";
import type { SubmissionEvent } from "@/entities/review/model/types";
import {
  KIND_INFO,
  formatPeriod,
  getUserStatus,
  kindOfSubmission,
  toSubmissionView,
} from "@/entities/submission";
import type { SubmissionView } from "@/entities/submission/model/types";
import { USER_STATUS_TEXT } from "@/entities/submission/ui/user-status-style";
import { useSessionUser } from "@/features/auth/model/auth-context";
import { hasAnyRole } from "@/features/auth/model/types";
import { DisplayPreview } from "@/features/display-preview";
import {
  useReviewHistory,
  useSubmissionDetail,
  useSubmissionSummary,
} from "@/features/submissions/api/queries";
import { SubmissionHistory } from "@/features/submissions/detail/ui/SubmissionHistory";
import { SubmitterActions } from "@/features/submissions/detail/ui/SubmitterActions";
import { PageState } from "@/shared/components";
import { to } from "@/shared/config/routes";
import {
  formatSeoulDayTime,
  seoulDayDiff,
} from "@/shared/lib/datetime";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";

/**
 * 컨텐츠 상세 (기획 4-1, 명세 FR-SUB-05).
 *
 * 올린 사람이 "지금 어떤 상태이고 왜 그런지"를 한 화면에서 본다. 반려·중단이면
 * 사유를 맨 위에 두고, 이어서 TV에 나오는 모습(실제 TV 렌더러를 줄인 것), 신청 내용,
 * 진행 순서를 둔다.
 *
 * 관리자가 자기 컨텐츠를 열면 올린 사람 버튼과 함께 심사 화면 링크를 둔다. 자기
 * 게시물도 승인·중단은 심사 화면에서 한다(명세 3.2, 서버도 막지 않는다).
 *
 * 표시 상태는 저장된 값이 아니라 서버 시각 기준 실제 상태다. 기준 시각은 요약
 * 응답의 `calculatedAt`을 쓴다. (명세 6.3)
 */
export function SubmissionDetailPage() {
  const { submissionId = "" } = useParams();
  const user = useSessionUser();
  const isReviewer = hasAnyRole(user, ["REVIEWER", "SUPER_ADMIN"]);

  const detail = useSubmissionDetail(submissionId);
  const history = useReviewHistory(submissionId);
  const summary = useSubmissionSummary("me");
  const targetLabel = useTargetGroupLabel(detail.data?.targetGroupIds ?? []);

  const isLoading = detail.isPending || history.isPending || summary.isPending;
  const error = detail.error ?? history.error ?? summary.error;

  const retry = () => {
    void detail.refetch();
    void history.refetch();
    void summary.refetch();
  };

  const serverNow = summary.data?.calculatedAt ?? new Date();
  const view = detail.data ? toSubmissionView(detail.data, serverNow) : null;

  return (
    <PageState
      isLoading={isLoading}
      error={error}
      onRetry={retry}
      loadingRows={5}
    >
      {view && (
        <>
          <div>
            <Link
              to={to.mine()}
              className="text-caption text-ink-muted hover:text-ink hover:underline"
            >
              내 컨텐츠
            </Link>
            {/* 좁은 화면에서는 버튼을 제목 아래로 내려 제목이 쪼개지지 않게 한다. */}
            <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
              <div className="min-w-0 flex-1">
                <h1 className="text-title text-ink">{view.title}</h1>
                <p className="mt-1 text-label text-ink-muted">
                  {KIND_INFO[kindOfSubmission(view)].name} · {formatPeriod(view)}{" "}
                  · {targetLabel ?? "위치 확인 중"}
                </p>
                <StatusLine view={view} now={serverNow} />
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                {view.requesterId === user.id && (
                  <SubmitterActions submission={view} isReviewer={isReviewer} />
                )}
                {isReviewer && (
                  // 결정·중단은 심사 화면에서 한다. 남의 컨텐츠면 이것이 주 동작이다.
                  <Button
                    size="sm"
                    variant={view.requesterId === user.id ? "outline" : "default"}
                    asChild
                  >
                    <Link to={to.reviewDetail(view.id)}>심사 화면에서 보기</Link>
                  </Button>
                )}
              </div>
            </div>
          </div>

          <DecisionReason
            view={view}
            events={history.data ?? []}
            now={serverNow}
          />

          <div className="flex flex-wrap items-start gap-8">
            <section
              aria-labelledby="tv-preview"
              className="min-w-0 flex-[999_1_520px]"
            >
              <h2 id="tv-preview" className="mb-2.5 text-body font-extrabold text-ink">
                TV에서 이렇게 보여요
              </h2>
              <DisplayPreview
                poster={fromSubmissionView(view)}
                serverTime={serverNow}
              />
            </section>

            <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-7">
              <section aria-labelledby="content-info">
                <h2 id="content-info" className="text-body font-extrabold text-ink">
                  신청 내용
                </h2>
                <dl className="mt-2.5 grid grid-cols-[4.5rem_minmax(0,1fr)] gap-y-1.5 text-label">
                  {view.subtitle && <Meta label="부제">{view.subtitle}</Meta>}
                  {view.location && <Meta label="장소">{view.location}</Meta>}
                  <Meta label="주최">{view.organizerName ?? "없음"}</Meta>
                  <Meta label="분류">{view.categoryName}</Meta>
                  <Meta label="기간">
                    {formatPeriod(view)} · {seoulDayDiff(view.startAt, view.endAt) + 1}일
                  </Meta>
                  <Meta label="위치">{targetLabel ?? "확인하는 중"}</Meta>
                  <Meta label="QR 링크">
                    {view.detailUrl ? (
                      <a
                        href={view.detailUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex items-center gap-1 [overflow-wrap:anywhere] underline-offset-4 hover:underline"
                      >
                        {view.detailUrl.replace(/^https?:\/\//, "")}
                        <ExternalLink size={13} aria-hidden="true" />
                      </a>
                    ) : (
                      "없음 · TV에 QR이 나가지 않음"
                    )}
                  </Meta>
                </dl>
                {view.description && (
                  <p className="mt-3 text-label whitespace-pre-line text-ink-muted">
                    {view.description}
                  </p>
                )}
              </section>

              <section
                aria-labelledby="progress"
                className="border-t border-line pt-6"
              >
                <h2 id="progress" className="mb-2.5 text-body font-extrabold text-ink">
                  진행
                </h2>
                <SubmissionHistory events={history.data ?? []} />
              </section>
            </div>
          </div>
        </>
      )}
    </PageState>
  );
}

function StatusLine({ view, now }: { view: SubmissionView; now: Date }) {
  const status = getUserStatus(view, now);
  return (
    <p className="mt-1.5 text-label">
      <span className={cn("font-bold", USER_STATUS_TEXT[status.tone])}>
        {status.label}
      </span>
      {status.note && <span className="text-ink-muted"> · {status.note}</span>}
    </p>
  );
}

/**
 * 반려·중단 사유. 올린 사람이 가장 먼저 알아야 하는 것이라 맨 위에 둔다.
 * 사유는 마지막 반려·중단 기록에서 가져온다.
 */
function DecisionReason({
  view,
  events,
  now,
}: {
  view: SubmissionView;
  events: SubmissionEvent[];
  now: Date;
}) {
  if (view.status !== "REJECTED" && view.status !== "SUSPENDED") return null;
  const type = view.status === "REJECTED" ? "REJECTED" : "SUSPENDED";
  const latest = [...events]
    .filter((event) => event.type === type)
    .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())[0];

  const title =
    type === "REJECTED"
      ? latest?.reasonCode
        ? `반려 · ${getRejectionReasonLabel(latest.reasonCode)}`
        : "반려"
      : "게시 중단";

  return (
    <section
      aria-labelledby="decision-reason"
      className="rounded-card bg-surface px-6 py-5 ring-1 ring-accent-200"
    >
      <h2 id="decision-reason" className="text-body font-extrabold text-accent-700">
        {title}
      </h2>
      {latest?.comment && (
        <p className="mt-1.5 text-subhead font-normal text-ink">
          {latest.comment}
        </p>
      )}
      {latest && (
        <p className="mt-1.5 text-caption text-ink-subtle">
          {latest.actorName} · {formatSeoulDayTime(latest.occurredAt, now)}
        </p>
      )}
    </section>
  );
}

function Meta({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <dt className="text-ink-subtle">{label}</dt>
      <dd className="m-0 min-w-0 text-ink">{children}</dd>
    </>
  );
}
