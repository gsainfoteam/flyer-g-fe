import { Monitor, Pause, Play } from "lucide-react";
import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import "./App.css";
import { Logo } from "./components/common/Logo";
import { ApprovalPanel } from "./components/dashboard/ApprovalPanel";
import { RecentContentSection } from "./components/dashboard/RecentContentSection";
import { SummaryStats } from "./components/dashboard/SummaryStats";
import { DisplayLayoutSwitcher } from "./components/display/DisplayLayoutSwitcher";
import type { DisplayMode } from "./components/display/DisplayLayoutSwitcher";
import { FourSplitDisplay } from "./components/display/FourSplitDisplay";
import { SinglePosterDisplay } from "./components/display/SinglePosterDisplay";
import { Sidebar } from "./components/layout/Sidebar";
import { TopHeader } from "./components/layout/TopHeader";
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
import { PageState } from "@/shared/components";
import { formatSeoulDateTime, toSeoulDateInputValue } from "@/shared/lib/datetime";
import { Button } from "@/shared/ui/button";

/** Phase 01에서 실제 기기 route(`/display/:deviceId`)로 바뀐다. */
const PREVIEW_DEVICE_ID = "device-preview";

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

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <div className="flex">
        <Sidebar />
        <main className="min-w-0 flex-1 px-5 py-6 lg:px-8">
          <div className="mx-auto max-w-content space-y-6">
            <div className="md:hidden">
              <Logo />
            </div>
            <TopHeader
              title="대시보드"
              description="게시 신청 현황과 승인 대기를 확인합니다."
            />

            <PageState isLoading={isLoading} error={error} onRetry={retry}>
              {summary.data && list.data && pending.data && (
                <div className="space-y-5">
                  <SummaryStats
                    caption={`${formatSeoulDateTime(summary.data.calculatedAt)} 기준`}
                    items={[
                      { label: "전체 콘텐츠", value: summary.data.total, unit: "개" },
                      { label: "게시 중", value: summary.data.published, unit: "개" },
                      { label: "예약됨", value: summary.data.scheduled, unit: "개" },
                      {
                        label: "승인 대기",
                        value: summary.data.pendingReview,
                        unit: "건",
                        emphasis: true,
                      },
                    ]}
                  />

                  <div className="grid gap-5 lg:grid-cols-3">
                    <div className="min-w-0 lg:col-span-2">
                      <RecentContentSection submissions={list.data.items} />
                    </div>
                    <div className="min-w-0">
                      <ApprovalPanel submissions={pending.data.items} />
                    </div>
                  </div>
                </div>
              )}
            </PageState>
          </div>
        </main>
      </div>
    </div>
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
      <header className="flex h-(--layout-header-height) shrink-0 items-center justify-between border-b border-line bg-surface px-5">
        <div className="flex items-center gap-4">
          <Logo size="sm" subtitle={false} />
          <div className="h-8 w-px bg-line" />
          <div>
            <h1 className="text-heading text-ink">콘텐츠 등록</h1>
            <p className="text-caption text-ink-muted">
              포스터를 올리고 TV 게시판에 게시를 신청합니다.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="outline" asChild>
            <a href="/display">
              <Monitor aria-hidden="true" />
              미리보기
            </a>
          </Button>
          <Button
            onClick={() =>
              toast.info("게시 신청은 Phase 02에서 서버와 연결됩니다.", {
                description: "지금은 화면 흐름만 확인할 수 있습니다.",
              })
            }
          >
            게시 신청
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

function DisplayPage() {
  const playlist = useDisplayPlaylist(PREVIEW_DEVICE_ID);
  const posters = useMemo(() => playlist.data?.posters ?? [], [playlist.data]);

  const [mode, setMode] = useState<DisplayMode>("single");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const rotationMs = (playlist.data?.layout.rotationSeconds ?? 10) * 1000;

  useEffect(() => {
    if (paused || posters.length <= 1) return;
    const id = window.setInterval(() => {
      setCurrentIndex((index) => (index + 1) % posters.length);
    }, rotationMs);
    return () => window.clearInterval(id);
  }, [paused, posters.length, rotationMs]);

  const handleModeChange = (nextMode: DisplayMode) => {
    setMode(nextMode);
    setCurrentIndex(0);
  };

  const current = posters[currentIndex % Math.max(posters.length, 1)];

  return (
    <div className="relative flex h-screen flex-col overflow-hidden p-6 text-ink">
      <div className="tv-surface absolute inset-0" />

      {/* 운영 화면에서는 이 컨트롤을 숨겨야 한다. preview mode 분리는 Phase 05 범위. */}
      <header className="relative z-(--layer-header) flex shrink-0 justify-center pb-4">
        <DisplayLayoutSwitcher mode={mode} onModeChange={handleModeChange} />
      </header>

      <main className="relative z-(--layer-base) min-h-0 flex-1">
        <PageState
          isLoading={playlist.isPending}
          error={playlist.error}
          onRetry={() => void playlist.refetch()}
          isEmpty={posters.length === 0}
          empty={{
            title: "지금 표시할 콘텐츠가 없습니다.",
            description: "승인된 게시 기간의 콘텐츠가 있으면 자동으로 나타납니다.",
          }}
        >
          {current && mode === "single" && <SinglePosterDisplay poster={current} />}
          {current && mode === "four" && (
            <FourSplitDisplay
              posters={[
                ...posters.slice(currentIndex),
                ...posters.slice(0, currentIndex),
              ]}
            />
          )}
        </PageState>
      </main>

      {posters.length > 0 && (
        <footer className="relative z-(--layer-header) flex shrink-0 items-center justify-center pt-4">
          <div className="flex items-center gap-2">
            {posters.map((poster, index) => (
              <button
                key={poster.id}
                type="button"
                aria-label={`${index + 1}번째 콘텐츠`}
                aria-current={index === currentIndex % posters.length}
                onClick={() => setCurrentIndex(index)}
                className={`h-2 rounded-pill transition-all ${
                  index === currentIndex % posters.length
                    ? "w-8 bg-brand"
                    : "w-2 bg-line-strong hover:bg-ink-subtle"
                }`}
              />
            ))}
          </div>
          <Button
            size="icon-lg"
            aria-label={paused ? "자동 재생" : "일시정지"}
            onClick={() => setPaused((value) => !value)}
            className="absolute right-0 rounded-pill"
          >
            {paused ? (
              <Play fill="currentColor" aria-hidden="true" />
            ) : (
              <Pause fill="currentColor" aria-hidden="true" />
            )}
          </Button>
        </footer>
      )}
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
