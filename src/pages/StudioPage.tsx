import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { to } from "@/app/router/routes";
import { Logo } from "@/components/common/Logo";
import { CanvasPreview } from "@/components/studio/CanvasPreview";
import { RegisterMetaPanel } from "@/components/studio/RegisterMetaPanel";
import { UploadPanel } from "@/components/studio/UploadPanel";
import { fromSubmissionView } from "@/entities/poster";
import type { SubmissionView } from "@/entities/submission/model/types";
import { useSubmissionViews } from "@/features/submissions/api/queries";
import { PageState } from "@/shared/components";
import { toSeoulDateInputValue } from "@/shared/lib/datetime";
import { Button } from "@/shared/ui/button";

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

/**
 * 게시 신청.
 *
 * 업로드 검증, 폼 검증, 실제 제출, Ziggle 공지 자동 채움은 Phase 02 범위다.
 * 지금은 화면 흐름과 미리보기까지만 동작한다.
 */
export function StudioPage() {
  const list = useSubmissionViews({ limit: 12 });
  const submissions = useMemo(() => list.data?.items ?? [], [list.data]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [customPreviewUrl, setCustomPreviewUrl] = useState<string | null>(null);
  /** 선택한 포스터 값 위에 사용자가 덮어쓴 부분만 담는다. */
  const [edits, setEdits] = useState<Partial<StudioDraft>>({});

  const selected =
    submissions.find((item) => item.id === selectedId) ?? submissions[0];
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
    <>
      <header className="flex h-(--layout-header-height) shrink-0 items-center gap-4 border-b border-line bg-surface px-4 sm:px-6">
        <Link to={to.dashboard()} className="shrink-0">
          <Logo size="md" />
        </Link>
        <div className="hidden h-7 w-px bg-line sm:block" />
        <div className="min-w-0">
          <h1 className="text-heading text-ink">게시 신청</h1>
          <p className="hidden text-caption text-ink-muted sm:block">
            포스터를 올리고 TV 게시판에 게시를 신청합니다
          </p>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2.5">
          <Button variant="secondary" size="sm" asChild>
            <Link to={to.display("device-preview")}>TV 미리보기</Link>
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
    </>
  );
}
