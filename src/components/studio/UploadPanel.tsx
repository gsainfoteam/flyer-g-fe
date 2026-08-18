import { UploadCloud } from "lucide-react";
import { fromSubmissionView } from "@/entities/poster";
import type { SubmissionView } from "@/entities/submission/model/types";
import { cn } from "@/shared/lib/utils";
import { PosterArtwork } from "../common/PosterArtwork";

/**
 * 포스터 선택 패널.
 *
 * 형식·용량·해상도 검증, drag&drop, 업로드 진행·실패·재시도는 Phase 02 범위다.
 * 지금은 파일을 골라 미리보기에 반영하는 것까지만 한다.
 */
interface UploadPanelProps {
  submissions: SubmissionView[];
  selectedId: string;
  onSelectSubmission: (id: string) => void;
  onFileSelect: (file: File) => void;
  customPreviewUrl?: string | null;
}

const SAMPLE_COUNT = 6;

export function UploadPanel({
  submissions,
  selectedId,
  onSelectSubmission,
  onFileSelect,
  customPreviewUrl,
}: UploadPanelProps) {
  const samples = submissions.slice(0, SAMPLE_COUNT);

  return (
    <aside className="flex h-full w-[272px] shrink-0 flex-col overflow-y-auto border-r border-line bg-surface">
      <div className="border-b border-line px-4 py-3.5">
        <h2 className="text-body font-bold text-ink">포스터 업로드</h2>
        <p className="mt-0.5 text-caption text-ink-subtle">
          이미지를 선택하거나 예시 포스터를 고르세요
        </p>
      </div>

      <div className="p-4">
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-card border-2 border-dashed border-brand-border bg-brand-subtle/60 px-4 py-6 text-center transition hover:bg-brand-subtle focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onFileSelect(file);
            }}
          />
          <div className="grid size-12 place-items-center rounded-pill bg-surface text-brand shadow-card">
            <UploadCloud className="size-6" aria-hidden="true" />
          </div>
          <p className="mt-3 text-label font-bold text-ink">
            이미지 파일을 선택해 업로드하세요
          </p>
          <p className="mt-1 text-caption text-ink-subtle">
            JPG, PNG, WebP (최대 10MB)
          </p>
          <span className="mt-3 rounded-pill bg-brand px-4 py-1.5 text-label font-black text-brand-on">
            파일 선택
          </span>
        </label>

        {customPreviewUrl && (
          <div className="mt-4 overflow-hidden rounded-control ring-2 ring-brand">
            <div className="aspect-[3/4] w-full bg-surface-muted">
              <img
                src={customPreviewUrl}
                alt="방금 업로드한 포스터"
                className="h-full w-full object-cover"
              />
            </div>
            <p className="bg-brand-subtle px-2 py-1.5 text-center text-caption font-bold text-brand-strong">
              방금 업로드한 이미지
            </p>
          </div>
        )}

        <div className="mt-5">
          <h3 className="text-label font-bold text-ink">
            예시 포스터{" "}
            <span className="text-ink-subtle">({samples.length})</span>
          </h3>
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            {samples.map((submission) => (
              <button
                key={submission.id}
                type="button"
                onClick={() => onSelectSubmission(submission.id)}
                aria-label={`${submission.title} 포스터 선택`}
                aria-pressed={!customPreviewUrl && selectedId === submission.id}
                className={cn(
                  "overflow-hidden rounded-control ring-2 transition",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
                  !customPreviewUrl && selectedId === submission.id
                    ? "ring-brand"
                    : "ring-transparent hover:ring-brand-border",
                )}
              >
                <div className="aspect-[3/4] w-full overflow-hidden bg-surface-muted">
                  <PosterArtwork
                    poster={fromSubmissionView(submission)}
                    fit="cover"
                  />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
