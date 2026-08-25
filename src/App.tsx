import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import "./App.css";
import { Logo } from "./components/common/Logo";
import { ApprovalPanel } from "./components/dashboard/ApprovalPanel";
import { RecentContentSection } from "./components/dashboard/RecentContentSection";
import { StatusCountBar } from "./components/dashboard/StatusCountBar";
import { FourSplitDisplay } from "./components/display/FourSplitDisplay";
import { LiveClock } from "./components/display/LiveClock";
import { SinglePosterDisplay } from "./components/display/SinglePosterDisplay";
import { SiteFooter } from "./components/layout/SiteFooter";
import { TopNav } from "./components/layout/TopNav";
import { CanvasPreview } from "./components/studio/CanvasPreview";
import { RegisterMetaPanel } from "./components/studio/RegisterMetaPanel";
import { UploadPanel } from "./components/studio/UploadPanel";
import { fromSubmissionView } from "@/entities/poster";
import type { SubmissionView } from "@/entities/submission/model/types";
import { useDisplayPlaylist } from "@/features/display/api/queries";
import { usePendingReviews } from "@/features/reviews/api/queries";
import {
  useSubmissionSummary,
  useSubmissionViews,
} from "@/features/submissions/api/queries";
import { EmptyState, PageState, Panel } from "@/shared/components";
import {
  formatElapsed,
  formatSeoulDateTime,
  toSeoulDateInputValue,
} from "@/shared/lib/datetime";
import { Button } from "@/shared/ui/button";

/** Phase 01에서 실제 기기 route(`/display/:deviceId`)로 바뀐다. */
const PREVIEW_DEVICE_ID = "device-preview";
const PREVIEW_DEVICE_LABEL = "학사기숙사 A동 로비";

/** Phase 01의 인증 세션에서 받아온다. 지금은 자리표시자다. */
const CURRENT_USER = { name: "이수현", role: "하우스 관리자" };

function AdminShell({
  pendingCount,
  children,
}: {
  pendingCount: number;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      <TopNav
        user={CURRENT_USER}
        items={[
          { label: "홈", href: "/" },
          { label: "승인 대기", href: "/reviews", count: pendingCount },
          { label: "전체 신청", href: "/submissions" },
          { label: "기기", href: "/displays" },
        ]}
      />
      <main className="flex-1 px-6 py-9 lg:px-10">
        <div className="mx-auto flex max-w-content flex-col gap-6">{children}</div>
      </main>
      <SiteFooter />
    </div>
  );
}

function DashboardPage() {
  const summary = useSubmissionSummary("me");
  const list = useSubmissionViews({ limit: 12 });
  const pending = usePendingReviews(5);

  const isLoading = summary.isPending || list.isPending || pending.isPending;
  const error = summary.error ?? list.error ?? pending.error;

  const retry = () => {
    void summary.refetch();
    void list.refetch();
    void pending.refetch();
  };

  const now = summary.data?.calculatedAt ?? new Date();
  const pendingItems = pending.data?.items ?? [];
  const oldestWait = pendingItems[0]
    ? formatElapsed(pendingItems[0].createdAt, now)
    : null;

  return (
    <AdminShell pendingCount={summary.data?.pendingReview ?? 0}>
      <PageState
        isLoading={isLoading}
        error={error}
        onRetry={retry}
        loadingRows={5}
      >
        {summary.data && list.data && pending.data && (
          <>
            <div className="flex flex-wrap items-end gap-6">
              <div className="min-w-0 flex-1">
                <p className="text-label text-ink-muted">
                  {formatSeoulDateTime(now)} · 서버 시각 기준 ·{" "}
                  {PREVIEW_DEVICE_LABEL}
                </p>
                <h1 className="mt-1.5 text-display text-ink">
                  {summary.data.pendingReview > 0 ? (
                    <>
                      검토를 기다리는 신청{" "}
                      <span className="text-accent">
                        {summary.data.pendingReview}건
                      </span>
                      {oldestWait && (
                        <>
                          , 가장 오래된 건{" "}
                          <span className="text-accent">{oldestWait}</span> 됐어요
                        </>
                      )}
                    </>
                  ) : (
                    "지금 처리할 신청이 없어요"
                  )}
                </h1>
              </div>
              <Button disabled>순서대로 검토 시작</Button>
            </div>

            <StatusCountBar
              counts={[
                {
                  label: "승인 대기",
                  value: summary.data.pendingReview,
                  emphasis: true,
                },
                { label: "게시 중", value: summary.data.published },
                { label: "예약됨", value: summary.data.scheduled },
                { label: "종료됨", value: summary.data.ended },
              ]}
              trailing={
                <span className="text-label font-semibold text-ink-muted">
                  전체 {summary.data.total}건
                </span>
              }
            />

            <div className="grid min-w-0 gap-5 lg:grid-cols-[1fr_344px]">
              <ApprovalPanel
                submissions={pendingItems}
                totalCount={summary.data.pendingReview}
                now={now}
              />

              <div className="flex min-w-0 flex-col gap-5">
                <Panel title="디스플레이 2대">
                  <ul className="flex flex-col gap-3.5 text-body">
                    <li className="flex items-center gap-2.5">
                      <span className="flex-1 font-semibold">A동 로비</span>
                      <span className="text-label text-ink-muted">12초 전</span>
                      <span className="rounded-pill bg-surface-muted px-2.5 py-1 text-overline text-ink-muted">
                        온라인
                      </span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <span className="flex-1 font-semibold">B동 로비</span>
                      <span className="text-label text-ink-muted">26분 전</span>
                      <span className="rounded-pill bg-attention-subtle px-2.5 py-1 text-overline text-attention-strong">
                        오프라인
                      </span>
                    </li>
                  </ul>
                  <p className="mt-4 text-caption text-ink-subtle">
                    오프라인 기기는 마지막 편성을 계속 재생하고 있어요. 기기 상태는
                    Phase 06에서 실제 heartbeat로 연결합니다.
                  </p>
                </Panel>

                <Panel
                  title="지금 TV에 걸린 것"
                  action={
                    <Button variant="link" size="xs" asChild>
                      <a href="/display">미리보기 →</a>
                    </Button>
                  }
                >
                  <PublishedMini submissions={list.data.items} />
                </Panel>
              </div>
            </div>

            <RecentContentSection submissions={list.data.items} />
          </>
        )}
      </PageState>
    </AdminShell>
  );
}

function PublishedMini({ submissions }: { submissions: SubmissionView[] }) {
  const published = submissions
    .filter((submission) => submission.status === "PUBLISHED")
    .slice(0, 3);

  if (published.length === 0) {
    return <EmptyState title="지금 걸린 콘텐츠가 없어요" className="py-2" />;
  }

  return (
    <ul className="flex flex-col gap-3.5">
      {published.map((submission) => (
        <li key={submission.id} className="flex items-center gap-3">
          <div className="aspect-3/4 w-[34px] shrink-0 overflow-hidden rounded-[6px] bg-canvas">
            <img
              src={submission.posterUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-label font-bold text-ink">
              {submission.title}
            </p>
            <p className="text-caption text-ink-muted">
              ~ {toSeoulDateInputValue(submission.endAt).slice(5).replace("-", ". ")}.
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

interface StudioDraft {
  title: string;
  category: string;
  startDate: string;
  endDate: string;
  detailUrl: string;
}

const EMPTY_DRAFT: StudioDraft = {
  title: "",
  category: "공지",
  startDate: "",
  endDate: "",
  detailUrl: "",
};

function toDraft(submission: SubmissionView | undefined): StudioDraft {
  if (!submission) return EMPTY_DRAFT;
  return {
    title: submission.title,
    category: submission.categoryName,
    startDate: toSeoulDateInputValue(submission.startAt),
    endDate: toSeoulDateInputValue(submission.endAt),
    detailUrl: submission.detailUrl,
  };
}

function StudioPage() {
  const list = useSubmissionViews({ limit: 12 });
  const submissions = useMemo(() => list.data?.items ?? [], [list.data]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [customPreviewUrl, setCustomPreviewUrl] = useState<string | null>(null);
  /** 선택한 포스터 값 위에 사용자가 덮어쓴 부분만 담는다. */
  const [edits, setEdits] = useState<Partial<StudioDraft>>({});

  const selected =
    submissions.find((item) => item.id === selectedId) ?? submissions[0];

  // 폼 값은 선택한 포스터에서 파생한다. Phase 02에서 Ziggle 공지 자동 채움으로 대체된다.
  const draft = { ...toDraft(selected), ...edits };

  useEffect(() => {
    return () => {
      if (customPreviewUrl) URL.revokeObjectURL(customPreviewUrl);
    };
  }, [customPreviewUrl]);

  const handleSelect = (id: string) => {
    if (!submissions.some((item) => item.id === id)) return;
    setSelectedId(id);
    setEdits({});
    setCustomPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
  };

  const handleFileSelect = (file: File) => {
    setCustomPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(file);
    });
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-canvas text-ink">
      <header className="flex h-(--layout-header-height) shrink-0 items-center gap-5 border-b border-line bg-surface px-6">
        <a href="/" className="shrink-0">
          <Logo size="md" />
        </a>
        <div className="h-7 w-px bg-line" />
        <div className="min-w-0">
          <h1 className="text-heading text-ink">게시 신청</h1>
          <p className="text-caption text-ink-muted">
            포스터를 올리고 TV 게시판에 게시를 신청합니다
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2.5">
          <Button variant="secondary" size="sm" asChild>
            <a href="/display">TV 미리보기</a>
          </Button>
          <Button
            size="sm"
            onClick={() =>
              toast.info("게시 신청은 Phase 02에서 서버와 연결됩니다.", {
                description: "지금은 화면 흐름만 확인할 수 있어요.",
              })
            }
          >
            제출하기
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <PageState
          isLoading={list.isPending}
          error={list.error}
          onRetry={() => void list.refetch()}
        >
          {selected && (
            <div className="flex min-h-0 flex-1">
              <UploadPanel
                submissions={submissions}
                selectedId={selected.id}
                onSelectSubmission={handleSelect}
                onFileSelect={handleFileSelect}
                customPreviewUrl={customPreviewUrl}
              />
              <CanvasPreview
                poster={fromSubmissionView(selected)}
                customPreviewUrl={customPreviewUrl}
              />
              <RegisterMetaPanel
                title={draft.title}
                category={draft.category}
                startDate={draft.startDate}
                endDate={draft.endDate}
                detailUrl={draft.detailUrl}
                onTitleChange={(title) => setEdits((d) => ({ ...d, title }))}
                onCategoryChange={(category) =>
                  setEdits((d) => ({ ...d, category }))
                }
                onStartDateChange={(startDate) =>
                  setEdits((d) => ({ ...d, startDate }))
                }
                onEndDateChange={(endDate) => setEdits((d) => ({ ...d, endDate }))}
                onDetailUrlChange={(detailUrl) =>
                  setEdits((d) => ({ ...d, detailUrl }))
                }
              />
            </div>
          )}
        </PageState>
      </div>
    </div>
  );
}

/**
 * TV 플레이어.
 *
 * 조작 UI가 없다. 시청자는 지나가며 보고, 기기는 사람이 만지지 않는다.
 * 레이아웃은 서버 편성이 정한다. 운영자 미리보기 모드와 실제 kiosk route 분리는
 * Phase 05 범위다. (명세 FR-PLY-02)
 */
function DisplayPage() {
  const playlist = useDisplayPlaylist(PREVIEW_DEVICE_ID);
  const posters = useMemo(() => playlist.data?.posters ?? [], [playlist.data]);
  const layout = playlist.data?.layout.type ?? "SINGLE";
  const rotationMs = (playlist.data?.layout.rotationSeconds ?? 10) * 1000;
  const serverTime = playlist.data?.serverTime ?? new Date();

  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (layout !== "SINGLE" || posters.length <= 1) return;
    const id = window.setInterval(() => {
      setCurrentIndex((index) => (index + 1) % posters.length);
    }, rotationMs);
    return () => window.clearInterval(id);
  }, [layout, posters.length, rotationMs]);

  const current = posters[currentIndex % Math.max(posters.length, 1)];

  return (
    <div className="tv-surface flex h-screen flex-col overflow-hidden p-[80px] text-ink">
      <PageState
        isLoading={playlist.isPending}
        error={playlist.error}
        onRetry={() => void playlist.refetch()}
        isEmpty={posters.length === 0}
        empty={{
          title: "지금 게시 중인 안내가 없습니다",
          description: "게시 신청은 Ziggle 공지에서 할 수 있어요.",
        }}
      >
        {current && layout === "SINGLE" && (
          <SinglePosterDisplay
            poster={current}
            deviceLabel={PREVIEW_DEVICE_LABEL}
            serverTime={serverTime}
          />
        )}
        {current && layout === "FOUR_GRID" && (
          <div className="flex h-full flex-col">
            <div className="flex shrink-0 items-center gap-4 pb-8">
              <Logo size="lg" />
              <span className="text-[26px] text-ink-subtle">
                {PREVIEW_DEVICE_LABEL} · 게시 중 {posters.length}건
              </span>
              <LiveClock
                now={serverTime}
                className="ml-auto text-[30px]"
              />
            </div>
            <div className="min-h-0 flex-1">
              <FourSplitDisplay posters={posters} />
            </div>
          </div>
        )}
      </PageState>
    </div>
  );
}

/**
 * 개발 전용 컴포넌트 카탈로그. production 빌드에서는 import 자체가 제거되어
 * 번들에 포함되지 않고 경로로도 접근할 수 없다. (Phase 00 문서 6절)
 */
const ComponentCatalog = import.meta.env.DEV
  ? lazy(() => import("./dev/ComponentCatalog"))
  : null;

function App() {
  const pathname = window.location.pathname;
  if (ComponentCatalog && pathname.startsWith("/catalog")) {
    return (
      <Suspense fallback={null}>
        <ComponentCatalog />
      </Suspense>
    );
  }
  if (pathname.startsWith("/studio")) return <StudioPage />;
  if (pathname.startsWith("/display")) return <DisplayPage />;
  return <DashboardPage />;
}

export default App;
