import {
  Clock,
  Eye,
  FileText,
  HelpCircle,
  Monitor,
  Pause,
  Send,
} from "lucide-react";
import { useState } from "react";
import "./App.css";
import { mockContents } from "./data/mockContents";
import { Logo } from "./components/common/Logo";
import { AnalyticsCard } from "./components/dashboard/AnalyticsCard";
import { ApprovalPanel } from "./components/dashboard/ApprovalPanel";
import { GuideCard } from "./components/dashboard/GuideCard";
import { RecentContentSection } from "./components/dashboard/RecentContentSection";
import { SchedulePanel } from "./components/dashboard/SchedulePanel";
import { StatCard } from "./components/dashboard/StatCard";
import { DisplayLayoutSwitcher } from "./components/display/DisplayLayoutSwitcher";
import type { DisplayMode } from "./components/display/DisplayLayoutSwitcher";
import { FourSplitDisplay } from "./components/display/FourSplitDisplay";
import { GridDisplay } from "./components/display/GridDisplay";
import { SinglePosterDisplay } from "./components/display/SinglePosterDisplay";
import { SplitDisplay } from "./components/display/SplitDisplay";
import { Sidebar } from "./components/layout/Sidebar";
import { TopHeader } from "./components/layout/TopHeader";
import { CanvasPreview } from "./components/studio/CanvasPreview";
import { DesignPanel } from "./components/studio/DesignPanel";
import { StudioSidebar } from "./components/studio/StudioSidebar";
import { UploadPanel } from "./components/studio/UploadPanel";

function DashboardPage() {
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
                value="24"
                unit="개"
                change="12%"
                icon={FileText}
                tone="violet"
              />
              <StatCard
                label="게시 중인 콘텐츠"
                value="8"
                unit="개"
                change="5%"
                icon={Monitor}
                tone="blue"
              />
              <StatCard
                label="예약된 콘텐츠"
                value="6"
                unit="개"
                change="20%"
                icon={Clock}
                tone="orange"
              />
              <StatCard
                label="총 조회수 (7일)"
                value="12,530"
                change="18%"
                icon={Eye}
                tone="green"
              />
            </section>

            <div className="grid gap-6 lg:grid-cols-3">
              <div className="space-y-6 lg:col-span-2">
                <RecentContentSection contents={mockContents} />
                <AnalyticsCard />
              </div>
              <div className="space-y-6">
                <ApprovalPanel />
                <SchedulePanel />
                <GuideCard />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function StudioPage() {
  const [selectedContentId, setSelectedContentId] = useState(
    mockContents[0].id,
  );
  const [pages, setPages] = useState([1, 2, 3, 4]);
  const [selectedPage, setSelectedPage] = useState(1);
  const [qrValue, setQrValue] = useState(mockContents[0].linkUrl);
  const [toast, setToast] = useState("");

  const selectedContent =
    mockContents.find((content) => content.id === selectedContentId) ??
    mockContents[0];

  const handleSelectContent = (id: string) => {
    const content = mockContents.find((item) => item.id === id);
    setSelectedContentId(id);
    if (content) setQrValue(content.linkUrl);
  };

  const handleAddPage = () => {
    const nextPage = pages.length + 1;
    setPages((current) => [...current, nextPage]);
    setSelectedPage(nextPage);
  };

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gray-50 text-gray-900">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-gray-100 bg-white px-5">
        <div className="flex items-center gap-4">
          <Logo size="sm" subtitle={false} />
          <div className="h-8 w-px bg-gray-200" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black text-gray-900">
                콘텐츠 제작 스튜디오
              </h1>
              <span className="rounded-md bg-violet-100 px-1.5 py-0.5 text-[10px] font-black text-violet-700">
                Beta
              </span>
            </div>
            <p className="text-[11px] font-medium text-gray-400">
              나만의 콘텐츠를 만들고 디지털 게시판에 공유하세요.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="hidden items-center gap-1 text-xs font-bold text-gray-400 sm:flex">
            임시저장됨 10:30
          </span>
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
          <button className="grid size-9 place-items-center rounded-full text-gray-400 hover:bg-gray-100">
            <HelpCircle className="size-5" />
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <StudioSidebar />
        <UploadPanel
          contents={mockContents}
          selectedId={selectedContentId}
          onSelectContent={handleSelectContent}
          pages={pages}
          selectedPage={selectedPage}
          onSelectPage={setSelectedPage}
          onAddPage={handleAddPage}
        />
        <CanvasPreview
          content={selectedContent}
          selectedPage={selectedPage}
          totalPages={pages.length}
          onPrev={() => setSelectedPage((p) => Math.max(1, p - 1))}
          onNext={() => setSelectedPage((p) => Math.min(pages.length, p + 1))}
        />
        <DesignPanel qrValue={qrValue} onQrValueChange={setQrValue} />
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
  const currentIndex = 0;
  const current = mockContents[currentIndex];

  return (
    <div className="relative flex h-screen flex-col overflow-hidden p-6 text-gray-900">
      <div className="tv-gradient absolute inset-0" />

      <header className="relative z-10 flex shrink-0 justify-center pb-4">
        <DisplayLayoutSwitcher mode={mode} onModeChange={setMode} />
      </header>

      <main className="relative z-10 min-h-0 flex-1">
        {mode === "single" && <SinglePosterDisplay current={current} />}
        {mode === "split" && <SplitDisplay contents={mockContents} />}
        {mode === "four" && <FourSplitDisplay contents={mockContents} />}
        {mode === "grid" && <GridDisplay contents={mockContents} />}
      </main>

      <footer className="relative z-10 flex shrink-0 items-center justify-center pt-4">
        <div className="flex items-center gap-2">
          {mockContents.slice(0, 5).map((content, index) => (
            <span
              key={content.id}
              className={`h-2 rounded-full transition-all ${
                index === currentIndex ? "w-8 bg-violet-600" : "w-2 bg-gray-300"
              }`}
            />
          ))}
        </div>
        <button className="absolute right-0 grid size-11 place-items-center rounded-full bg-violet-600 text-white shadow-lg shadow-violet-300">
          <Pause className="size-5" fill="currentColor" />
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
