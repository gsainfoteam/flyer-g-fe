import { useMemo } from "react";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Link, useParams } from "react-router";
import { to } from "@/app/router/routes";
import { PosterArtwork } from "@/components/common/PosterArtwork";
import { fromSubmissionView } from "@/entities/poster";
import { getStatusSentence, toSubmissionView } from "@/entities/submission";
import { DisplayPreview } from "@/features/display-preview";
import { DecisionActions } from "@/features/reviews/ui/DecisionActions";
import { ReviewWarnings } from "@/features/reviews/ui/ReviewWarnings";
import {
  useReviewHistory,
  useSubmissionDetail,
  useSubmissionSummary,
  useSubmissionViews,
} from "@/features/submissions/api/queries";
import { ReviewTimeline } from "@/features/submissions/detail/ui/ReviewTimeline";
import { PageState, Panel, StatusBadge } from "@/shared/components";
import { formatSeoulDateTime } from "@/shared/lib/datetime";
import { Button } from "@/shared/ui/button";

/**
 * 검토 상세 (명세 FR-REV-02).
 *
 * 관리자가 결정에 필요한 근거를 한 화면에서 본다: 원본 포스터, 실제 TV와 같은
 * 미리보기, 자동 경고, 이전 검토 이력. 화면에 보이는 검토 버전(v)이 결정과 함께
 * 서버로 가며, 그 사이 바뀌었으면 409로 거절된다. (명세 FR-REV-03)
 */
export function ReviewDetailPage() {
  const { submissionId = "" } = useParams();

  const detail = useSubmissionDetail(submissionId);
  const history = useReviewHistory(submissionId);
  const summary = useSubmissionSummary("all");
  const published = useSubmissionViews({ status: "PUBLISHED", limit: 4 });

  const isLoading = detail.isPending || history.isPending || summary.isPending;
  const error = detail.error ?? history.error ?? summary.error;

  const retry = () => {
    void detail.refetch();
    void history.refetch();
    void summary.refetch();
  };

  const serverNow = summary.data?.calculatedAt ?? new Date();
  const view = detail.data ? toSubmissionView(detail.data, serverNow) : null;
  const companions = useMemo(
    () => (published.data?.items ?? []).map(fromSubmissionView),
    [published.data],
  );

  return (
    <PageState isLoading={isLoading} error={error} onRetry={retry} loadingRows={5}>
      {view && detail.data && (
        <>
          <div>
            <Button variant="ghost" size="sm" asChild className="-ml-2.5">
              <Link to={to.reviews()}>
                <ArrowLeft aria-hidden="true" />
                승인 대기 목록으로
              </Link>
            </Button>

            <div className="mt-2 flex flex-wrap items-start gap-x-4 gap-y-2">
              <div className="min-w-0 flex-1">
                <h1 className="text-display text-ink">{view.title}</h1>
                <p className="mt-1.5 text-label text-ink-muted">
                  {view.organizationName} ·{" "}
                  {getStatusSentence({ status: view.status })} · 검토 버전 v
                  {detail.data.version}
                </p>
              </div>
              <StatusBadge status={view.status} className="mt-1.5" />
            </div>

            <div className="mt-4">
              <DecisionActions submission={detail.data} />
            </div>
          </div>

          <ReviewWarnings submission={detail.data} serverNow={serverNow} />

          <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[344px_1fr]">
            <div className="flex min-w-0 flex-col gap-5">
              <Panel title="원본 포스터">
                <div className="aspect-3/4 w-full overflow-hidden rounded-control bg-canvas ring-1 ring-line">
                  <PosterArtwork poster={fromSubmissionView(view)} fit="contain" />
                </div>
              </Panel>

              <Panel title="게시 정보">
                <dl className="space-y-3.5">
                  <div>
                    <dt className="text-caption text-ink-subtle">게시 기간</dt>
                    <dd className="mt-0.5 text-body text-ink">
                      {formatSeoulDateTime(view.startAt)} ~{" "}
                      {formatSeoulDateTime(view.endAt)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-caption text-ink-subtle">카테고리</dt>
                    <dd className="mt-0.5 text-body text-ink">
                      {view.categoryName}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-caption text-ink-subtle">대상 위치</dt>
                    <dd className="mt-0.5 text-body text-ink">전체 기기</dd>
                  </div>
                  <div>
                    <dt className="text-caption text-ink-subtle">Ziggle 원문</dt>
                    <dd className="mt-0.5">
                      <Button variant="link" size="xs" asChild>
                        <a
                          href={view.detailUrl}
                          target="_blank"
                          rel="noreferrer noopener"
                        >
                          새 창에서 확인
                          <ExternalLink aria-hidden="true" />
                        </a>
                      </Button>
                    </dd>
                  </div>
                </dl>
              </Panel>

              <Panel title="처리 이력">
                <ReviewTimeline
                  reviews={history.data ?? []}
                  createdAt={view.createdAt}
                />
              </Panel>
            </div>

            <Panel title="TV 미리보기">
              <DisplayPreview
                poster={fromSubmissionView(view)}
                companions={companions}
                serverTime={serverNow}
              />
            </Panel>
          </div>
        </>
      )}
    </PageState>
  );
}
