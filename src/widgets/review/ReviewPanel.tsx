import { useMemo } from "react";
import type { ReactNode, Ref } from "react";
import { ExternalLink } from "lucide-react";
import { PosterArtwork } from "@/entities/poster/ui/PosterArtwork";
import { fromSubmissionView } from "@/entities/poster";
import {
  EVENT_BANNER_OCCASION_LABELS,
  KIND_INFO,
  STORY_TAG_LABELS,
  getStatusSentence,
  toSubmissionView,
} from "@/entities/submission";
import type { SignageSubmissionExpanded } from "@/entities/submission";
import type {
  EventBanner,
  Story,
  SubmissionView,
} from "@/entities/submission/model/types";
import { useTargetGroupLabel } from "@/entities/device/api/queries";
import { DisplayPreview } from "@/features/display-preview";
import { DecisionActions } from "@/features/reviews/ui/DecisionActions";
import type {
  DecisionActionsHandle,
  ReviewDecisionKind,
} from "@/features/reviews/ui/DecisionActions";
import { ReviewWarnings } from "@/features/reviews/ui/ReviewWarnings";
import type { RejectionReasonCode } from "@/entities/review";
import {
  useReviewHistory,
  useSubmissionDetail,
  useSubmissionSummary,
  useSubmissionViews,
} from "@/features/submissions/api/queries";
import { SubmissionHistory } from "@/features/submissions/detail/ui/SubmissionHistory";
import { PageState, Panel } from "@/shared/components";
import { StatusBadge } from "@/entities/submission/ui/StatusBadge";
import { formatSeoulDateTime } from "@/shared/lib/datetime";
import { Button } from "@/shared/ui/button";

/**
 * 심사할 신청 한 건 (명세 FR-REV-02, 기획 4-2).
 *
 * 관리자가 결정에 필요한 근거를 한 칸에서 본다: 원본, 실제 TV와 같은 미리보기,
 * 자동 경고, 이전 검토 이력. 화면에 보이는 검토 버전(v)이 결정과 함께 서버로 가며,
 * 그 사이 바뀌었으면 409로 거절된다. (명세 FR-REV-03)
 *
 * 심사 화면(`ReviewsPage`)의 오른쪽 칸이다. 결정은 호출부가 받아 늦게 보낸다.
 */
interface ReviewPanelProps {
  submissionId: string;
  /** 제목 위에 놓을 것. 모바일의 "대기열로" 같은 링크 */
  header?: ReactNode;
  onApprove?: (submission: SignageSubmissionExpanded) => void;
  onReject?: (
    submission: SignageSubmissionExpanded,
    values: { reasonCode: RejectionReasonCode; comment: string },
  ) => void;
  /** 중단처럼 바로 보내는 결정이 끝난 뒤 */
  onDecided?: (kind: ReviewDecisionKind) => void;
  actionsRef?: Ref<DecisionActionsHandle>;
}

export function ReviewPanel({
  submissionId,
  header,
  onApprove,
  onReject,
  onDecided,
  actionsRef,
}: ReviewPanelProps) {
  const detail = useSubmissionDetail(submissionId);
  const history = useReviewHistory(submissionId);
  const summary = useSubmissionSummary("all");
  // 편성 v1은 포스터만 띄우므로 이웃 자리도 포스터로만 채운다.
  const published = useSubmissionViews({
    status: "PUBLISHED",
    scope: "all",
    types: ["POSTER"],
    limit: 4,
  });

  const isLoading = detail.isPending || history.isPending || summary.isPending;
  const error = detail.error ?? history.error ?? summary.error;

  const retry = () => {
    void detail.refetch();
    void history.refetch();
    void summary.refetch();
  };

  const serverNow = summary.data?.calculatedAt ?? new Date();
  const view = detail.data ? toSubmissionView(detail.data, serverNow) : null;
  const targetLabel = useTargetGroupLabel(view?.targetGroupIds ?? []);
  const companions = useMemo(
    () => (published.data?.items ?? []).map(fromSubmissionView),
    [published.data],
  );

  return (
    <PageState
      isLoading={isLoading}
      error={error}
      onRetry={retry}
      loadingRows={5}
    >
      {view && detail.data && (
        <>
          <div>
            {header}

            <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
              <div className="min-w-0 flex-1">
                <p className="text-caption text-ink-subtle">
                  {KIND_INFO[view.type].name}
                </p>
                <h2 className="mt-0.5 text-heading text-ink">{view.title}</h2>
                <p className="mt-1.5 text-label text-ink-muted">
                  {view.requesterName ?? "작성자 가림"} 신청 ·{" "}
                  {getStatusSentence({ status: view.status })} · 검토 버전 v
                  {detail.data.version}
                </p>
              </div>
              <StatusBadge status={view.status} className="mt-1.5" />
            </div>

            <div className="mt-4">
              <DecisionActions
                key={detail.data.id}
                ref={actionsRef}
                submission={detail.data}
                status={view.status}
                shortcuts
                onApprove={onApprove ? () => onApprove(detail.data) : undefined}
                onReject={
                  onReject
                    ? (values) => onReject(detail.data, values)
                    : undefined
                }
                onDecided={onDecided}
              />
            </div>
          </div>

          <ReviewWarnings submission={detail.data} serverNow={serverNow} />

          <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
            <Panel title="TV 미리보기">
              <DisplayPreview
                poster={fromSubmissionView(view)}
                companions={companions}
                serverTime={serverNow}
              />
            </Panel>
            <div className="grid min-w-0 items-start gap-5 md:grid-cols-2 xl:grid-cols-1">
              <OriginalPanel view={view} />

              <Panel title="게시 정보">
                <dl className="space-y-3.5">
                  <div>
                    <dt className="text-caption text-ink-subtle">게시 기간</dt>
                    <dd className="mt-0.5 text-body text-ink">
                      {view.startAt && view.endAt ? (
                        <>
                          {formatSeoulDateTime(view.startAt)} ~{" "}
                          {formatSeoulDateTime(view.endAt)}
                        </>
                      ) : (
                        "승인 후 정해짐"
                      )}
                    </dd>
                  </div>
                  {view.eventBanner && (
                    <EventBannerFields banner={view.eventBanner} />
                  )}
                  {view.story && <StoryFields story={view.story} />}
                  {view.type === "POSTER" && (
                    <>
                      <div>
                        <dt className="text-caption text-ink-subtle">
                          카테고리
                        </dt>
                        <dd className="mt-0.5 text-body text-ink">
                          {view.categoryName}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-caption text-ink-subtle">주최</dt>
                        <dd className="mt-0.5 text-body text-ink">
                          {view.organizerName ?? "없음"}
                        </dd>
                      </div>
                      {view.location && (
                        <div>
                          <dt className="text-caption text-ink-subtle">장소</dt>
                          <dd className="mt-0.5 text-body text-ink">
                            {view.location}
                          </dd>
                        </div>
                      )}
                      {view.description && (
                        <div>
                          <dt className="text-caption text-ink-subtle">설명</dt>
                          <dd className="mt-0.5 text-body whitespace-pre-line text-ink">
                            {view.description}
                          </dd>
                        </div>
                      )}
                    </>
                  )}
                  <div>
                    <dt className="text-caption text-ink-subtle">대상 위치</dt>
                    <dd className="mt-0.5 text-body text-ink">
                      {targetLabel ?? "확인하는 중"}
                    </dd>
                  </div>
                  {view.type === "POSTER" && (
                    <div>
                      <dt className="text-caption text-ink-subtle">
                        상세 링크
                      </dt>
                      <dd className="mt-0.5">
                        {view.detailUrl ? (
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
                        ) : (
                          <span className="text-body text-ink-muted">
                            없음 (QR 없이 게시)
                          </span>
                        )}
                      </dd>
                    </div>
                  )}
                </dl>
              </Panel>

              <Panel title="처리 이력" className="md:col-span-2 xl:col-span-1">
                <SubmissionHistory events={history.data ?? []} />
              </Panel>
            </div>
          </div>
        </>
      )}
    </PageState>
  );
}

/**
 * 심사할 원본. 영상 포스터는 대표 프레임이 아니라 영상을 재생해 끝까지 볼 수 있게
 * 한다. 이벤트는 올린 이미지나 사진을, 제보는 글뿐이라 칸을 그리지 않는다.
 */
function OriginalPanel({ view }: { view: SubmissionView }) {
  const banner = view.eventBanner;
  if (view.type === "STORY") return null;
  if (banner && !banner.assetUrl && !banner.photoUrl) return null;

  const isVideo = view.posterKind === "VIDEO" && view.posterVideoUrl !== null;
  const title = banner
    ? banner.mode === "IMAGE"
      ? "원본 이미지"
      : "사진"
    : isVideo
      ? "원본 영상"
      : "원본 포스터";

  return (
    <Panel title={title}>
      <div className="aspect-3/4 w-full overflow-hidden rounded-control bg-canvas ring-1 ring-line">
        {isVideo ? (
          <video
            src={view.posterVideoUrl ?? undefined}
            poster={view.posterUrl ?? undefined}
            controls
            muted
            playsInline
            preload="metadata"
            className="size-full object-contain"
          />
        ) : (
          <PosterArtwork poster={fromSubmissionView(view)} fit="contain" />
        )}
      </div>
    </Panel>
  );
}

function EventBannerFields({ banner }: { banner: EventBanner }) {
  const hasPhoto = banner.photoUrl !== null;
  return (
    <>
      <div>
        <dt className="text-caption text-ink-subtle">형식</dt>
        <dd className="mt-0.5 text-body text-ink">
          {banner.mode === "TEMPLATE" ? "문구로 만들기" : "이미지 올리기"}
          {banner.occasion &&
            ` · ${EVENT_BANNER_OCCASION_LABELS[banner.occasion]}`}
        </dd>
      </div>
      <div>
        <dt className="text-caption text-ink-subtle">받는 사람</dt>
        <dd className="mt-0.5 text-body text-ink">{banner.recipient}</dd>
      </div>
      {banner.message && (
        <div>
          <dt className="text-caption text-ink-subtle">문구</dt>
          <dd className="mt-0.5 text-body whitespace-pre-line text-ink">
            {banner.message}
          </dd>
        </div>
      )}
      {banner.sender && (
        <div>
          <dt className="text-caption text-ink-subtle">보낸 사람</dt>
          <dd className="mt-0.5 text-body text-ink">{banner.sender}</dd>
        </div>
      )}
      {banner.mode === "TEMPLATE" && (
        <div>
          <dt className="text-caption text-ink-subtle">사진</dt>
          <dd className="mt-0.5 text-body text-ink">
            {!hasPhoto
              ? "없음"
              : banner.photoConsent
                ? "있음 · 받는 사람 동의"
                : "있음 · 동의 없음"}
          </dd>
        </div>
      )}
    </>
  );
}

function StoryFields({ story }: { story: Story }) {
  return (
    <>
      <div>
        <dt className="text-caption text-ink-subtle">말머리</dt>
        <dd className="mt-0.5 text-body text-ink">
          {STORY_TAG_LABELS[story.tag]}
          {story.storyNumber !== null && ` · #${story.storyNumber}`}
        </dd>
      </div>
      <div>
        <dt className="text-caption text-ink-subtle">본문</dt>
        <dd className="mt-0.5 text-body whitespace-pre-line text-ink">
          {story.body}
        </dd>
      </div>
    </>
  );
}
