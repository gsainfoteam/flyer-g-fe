import { Clock, Eye, FileText, Monitor, Pause, Play, Send } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { Logo } from "./components/common/Logo";
import { ApprovalPanel } from "./components/dashboard/ApprovalPanel";
import { RecentContentSection } from "./components/dashboard/RecentContentSection";
import { StatCard } from "./components/dashboard/StatCard";
import { DisplayLayoutSwitcher } from "./components/display/DisplayLayoutSwitcher";
import type { DisplayMode } from "./components/display/DisplayLayoutSwitcher";
import { FourSplitDisplay } from "./components/display/FourSplitDisplay";
import { SinglePosterDisplay } from "./components/display/SinglePosterDisplay";
import { Sidebar } from "./components/layout/Sidebar";
import { TopHeader } from "./components/layout/TopHeader";
import { CanvasPreview } from "./components/studio/CanvasPreview";
import { RegisterMetaPanel } from "./components/studio/RegisterMetaPanel";
import { UploadPanel } from "./components/studio/UploadPanel";
import { mockContents } from "./data/mockContents";
import type { ContentCategory } from "./types/content";

const ROTATE_MS = 5000;

function useToast() {
  const [toast, setToast] = useState("");
  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };
  return { toast, showToast };
}

function DashboardPage() {
  const { toast, showToast } = useToast();

  const stats = useMemo(() => {
    const published = mockContents.filter((c) => c.status === "published").length;
    const scheduled = mockContents.filter((c) => c.status === "scheduled").length;
    const totalViews = mockContents.reduce((sum, c) => sum + c.views, 0);
    return {
      total: mockContents.length,
      published,
      scheduled,
      totalViews,
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#F8F7FF] text-gray-900">
      <div className="flex">
        <Sidebar />
        <main className="min-w-0 flex-1 px-5 py-6 lg:px-8">
          <div className="mx-auto max-w-[1500px] space-y-6">
            <div className="md:hidden">
              <Logo />
            </div>
            <TopHeader />

            <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <StatCard
                label="전체 콘텐츠"
                value={String(stats.total)}
                unit="개"
                change="12%"
                icon={FileText}
                tone="violet"
              />
              <StatCard
                label="게시 중인 콘텐츠"
                value={String(stats.published)}
                unit="개"
                change="5%"
                icon={Monitor}
                tone="blue"
              />
              <StatCard
                label="예약된 콘텐츠"
                value={String(stats.scheduled)}
                unit="개"
                change="20%"
                icon={Clock}
                tone="orange"
              />
              <StatCard
                label="총 조회수"
                value={stats.totalViews.toLocaleString()}
                change="18%"
                icon={Eye}
                tone="green"
              />
            </section>

            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <RecentContentSection contents={mockContents} />
              </div>
              <div>
                <ApprovalPanel onToast={showToast} />
              </div>
            </div>
          </div>
        </main>
      </div>

      {toast && (
        <div className="fixed right-6 top-20 z-50 rounded-2xl bg-gray-900 px-5 py-3.5 text-sm font-bold text-white shadow-2xl">
          {toast}
        </div>
      )}
    </div>
  );
}

function StudioPage() {
  const [selectedContentId, setSelectedContentId] = useState(
    mockContents[0].id,
  );
  const [customPreviewUrl, setCustomPreviewUrl] = useState<string | null>(null);
  const [title, setTitle] = useState(mockContents[0].title);
  const [category, setCategory] = useState<ContentCategory>(
    mockContents[0].category,
  );
  const [startDate, setStartDate] = useState(mockContents[0].startDate);
  const [endDate, setEndDate] = useState(mockContents[0].endDate ?? "");
  const [linkUrl, setLinkUrl] = useState(mockContents[0].linkUrl);
  const { toast, showToast } = useToast();

  const selectedContent =
    mockContents.find((content) => content.id === selectedContentId) ??
    mockContents[0];

  const handleSelectContent = (id: string) => {
    const content = mockContents.find((item) => item.id === id);
    setSelectedContentId(id);
    setCustomPreviewUrl(null);
    if (content) {
      setTitle(content.title);
      setCategory(content.category);
      setStartDate(content.startDate);
      setEndDate(content.endDate ?? "");
      setLinkUrl(content.linkUrl);
    }
  };

  const handleFileSelect = (file: File) => {
    if (customPreviewUrl) URL.revokeObjectURL(customPreviewUrl);
    const url = URL.createObjectURL(file);
    setCustomPreviewUrl(url);
    setTitle(file.name.replace(/\.[^.]+$/, ""));
  };

  useEffect(() => {
    return () => {
      if (customPreviewUrl) URL.revokeObjectURL(customPreviewUrl);
    };
  }, [customPreviewUrl]);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gray-50 text-gray-900">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-gray-100 bg-white px-5">
        <div className="flex items-center gap-4">
          <Logo size="sm" subtitle={false} />
          <div className="h-8 w-px bg-gray-200" />
          <div>
            <h1 className="text-base font-black text-gray-900">콘텐츠 등록</h1>
            <p className="text-[11px] font-medium text-gray-400">
              포스터를 올리고 TV 게시판에 게시 요청하세요.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <a
            href="/display"
            className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50"
          >
            <Monitor className="size-4" />
            미리보기
          </a>
          <button
            onClick={() =>
              showToast("게시 요청이 접수되었습니다. 승인 후 TV에 노출됩니다.")
            }
            className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-violet-600 to-violet-500 px-4 py-2 text-sm font-black text-white shadow-lg shadow-violet-200"
          >
            <Send className="size-4" />
            게시하기
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <UploadPanel
          contents={mockContents}
          selectedId={selectedContentId}
          onSelectContent={handleSelectContent}
          onFileSelect={handleFileSelect}
          customPreviewUrl={customPreviewUrl}
        />
        <CanvasPreview
          content={selectedContent}
          customPreviewUrl={customPreviewUrl}
        />
        <RegisterMetaPanel
          title={title}
          category={category}
          startDate={startDate}
          endDate={endDate}
          linkUrl={linkUrl}
          onTitleChange={setTitle}
          onCategoryChange={setCategory}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          onLinkUrlChange={setLinkUrl}
        />
      </div>

      {toast && (
        <div className="fixed right-6 top-20 z-50 rounded-2xl bg-gray-900 px-5 py-3.5 text-sm font-bold text-white shadow-2xl">
          {toast}
        </div>
      )}
    </div>
  );
}

function DisplayPage() {
  const [mode, setMode] = useState<DisplayMode>("single");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const published = useMemo(
    () =>
      mockContents.filter(
        (c) => c.status === "published" || c.status === "scheduled",
      ),
    [],
  );
  const rotationPool = published.length > 0 ? published : mockContents;
  const current = rotationPool[currentIndex % rotationPool.length];

  const handleModeChange = (nextMode: DisplayMode) => {
    setMode(nextMode);
    setCurrentIndex(0);
  };

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => {
      setCurrentIndex((index) => (index + 1) % rotationPool.length);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, [paused, rotationPool.length]);

  return (
    <div className="relative flex h-screen flex-col overflow-hidden p-6 text-gray-900">
      <div className="tv-gradient absolute inset-0" />

      <header className="relative z-10 flex shrink-0 justify-center pb-4">
        <DisplayLayoutSwitcher mode={mode} onModeChange={handleModeChange} />
      </header>

      <main className="relative z-10 min-h-0 flex-1">
        {mode === "single" && <SinglePosterDisplay current={current} />}
        {mode === "four" && (
          <FourSplitDisplay
            contents={[
              ...rotationPool.slice(currentIndex),
              ...rotationPool.slice(0, currentIndex),
            ]}
          />
        )}
      </main>

      <footer className="relative z-10 flex shrink-0 items-center justify-center pt-4">
        <div className="flex items-center gap-2">
          {rotationPool.map((content, index) => (
            <button
              key={content.id}
              aria-label={`${index + 1}번째 콘텐츠`}
              onClick={() => setCurrentIndex(index)}
              className={`h-2 rounded-full transition-all ${
                index === currentIndex % rotationPool.length
                  ? "w-8 bg-violet-600"
                  : "w-2 bg-gray-300 hover:bg-gray-400"
              }`}
            />
          ))}
        </div>
        <button
          onClick={() => setPaused((value) => !value)}
          aria-label={paused ? "자동 재생" : "일시정지"}
          className="absolute right-0 grid size-11 place-items-center rounded-full bg-violet-600 text-white shadow-lg shadow-violet-300"
        >
          {paused ? (
            <Play className="size-5" fill="currentColor" />
          ) : (
            <Pause className="size-5" fill="currentColor" />
          )}
        </button>
      </footer>
    </div>
  );
}

function App() {
  const pathname = window.location.pathname;
  if (pathname.startsWith("/studio")) return <StudioPage />;
  if (pathname.startsWith("/display")) return <DisplayPage />;
  return <DashboardPage />;
}

export default App;
