import { ArrowLeft, ExternalLink } from "lucide-react";
import { Link, useParams } from "react-router";
import { to } from "@/app/router/routes";
import { PosterArtwork } from "@/components/common/PosterArtwork";
import { QRCodeBox } from "@/components/common/QRCodeBox";
import { fromSubmissionView } from "@/entities/poster";
import { getStatusSentence, toSubmissionView } from "@/entities/submission";
import {
  useReviewHistory,
  useSubmissionDetail,
  useSubmissionSummary,
} from "@/features/submissions/api/queries";
import { ReviewTimeline } from "@/features/submissions/detail/ui/ReviewTimeline";
import { SubmitterActions } from "@/features/submissions/detail/ui/SubmitterActions";
import { PageState, Panel, StatusBadge } from "@/shared/components";
import {
  formatSeoulDateTime,
  formatSeoulShortDate,
} from "@/shared/lib/datetime";
import { Button } from "@/shared/ui/button";

/**
 * 신청 상세 (명세 FR-SUB-05, FR-DASH-02).
 *
 * 게시자가 "지금 어떤 상태이고 왜 그런지"를 한 화면에서 확인한다. 반려·중단
 * 사유는 검토 타임라인이 보여준다.
 *
 * 표시 상태는 저장된 값이 아니라 서버 시각 기준 실제 상태다. 기준 시각은 요약
 * 응답의 `calculatedAt`을 쓴다. (명세 6.3)
 */
export function SubmissionDetailPage() {
  const { submissionId = "" } = useParams();

  const detail = useSubmissionDetail(submissionId);
  const history = useReviewHistory(submissionId);
  const summary = useSubmissionSummary("me");

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
    <PageState isLoading={isLoading} error={error} onRetry={retry} loadingRows={5}>
      {view && detail.data && (
        <>
          <div>
            <Button variant="ghost" size="sm" asChild className="-ml-2.5">
              <Link to={to.submissions()}>
                <ArrowLeft aria-hidden="true" />
                목록으로
              </Link>
            </Button>

            <div className="mt-2 flex flex-wrap items-start gap-x-4 gap-y-2">
              <div className="min-w-0 flex-1">
                <h1 className="text-display text-ink">{view.title}</h1>
                <p className="mt-1.5 text-label text-ink-muted">
                  {getStatusSentence({
                    status: view.status,
                    startsAtLabel: formatSeoulDateTime(view.startAt),
                    endsAtLabel: formatSeoulShortDate(view.endAt),
                  })}
                </p>
              </div>
              <StatusBadge status={view.status} className="mt-1.5" />
            </div>

            <div className="mt-4">
              <SubmitterActions submission={view} />
            </div>
          </div>

          <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[344px_1fr]">
            <div className="flex min-w-0 flex-col gap-5">
              <Panel title="포스터">
                <div className="aspect-3/4 w-full overflow-hidden rounded-control bg-canvas ring-1 ring-line">
                  <PosterArtwork poster={fromSubmissionView(view)} fit="contain" />
                </div>
              </Panel>

              <Panel title="Ziggle 공지">
                <div className="flex items-center gap-3.5">
                  <QRCodeBox value={view.detailUrl} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-caption text-ink-muted">
                      {view.detailUrl}
                    </p>
                    <Button variant="link" size="xs" asChild className="mt-1">
                      <a
                        href={view.detailUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                      >
                        원문 보기
                        <ExternalLink aria-hidden="true" />
                      </a>
                    </Button>
                  </div>
                </div>
              </Panel>
            </div>

            <div className="flex min-w-0 flex-col gap-5">
              <Panel title="게시 정보">
                <dl className="grid gap-x-6 gap-y-3.5 sm:grid-cols-2">
                  <MetaItem label="게시 기간">
                    {formatSeoulDateTime(view.startAt)} ~{" "}
                    {formatSeoulDateTime(view.endAt)}
                  </MetaItem>
                  <MetaItem label="카테고리">{view.categoryName}</MetaItem>
                  <MetaItem label="주최">
                    {view.organizationName || "미지정"}
                  </MetaItem>
                  <MetaItem label="대상 위치">전체 기기</MetaItem>
                  <MetaItem label="신청 버전">v{detail.data.version}</MetaItem>
                  <MetaItem label="신청 ID">
                    <span className="font-mono text-caption">{view.id}</span>
                  </MetaItem>
                </dl>
              </Panel>

              <Panel title="처리 이력">
                <ReviewTimeline
                  reviews={history.data ?? []}
                  createdAt={view.createdAt}
                />
              </Panel>
            </div>
          </div>
        </>
      )}
    </PageState>
  );
}

function MetaItem({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-caption text-ink-subtle">{label}</dt>
      <dd className="mt-0.5 text-body text-ink">{children}</dd>
    </div>
  );
}
