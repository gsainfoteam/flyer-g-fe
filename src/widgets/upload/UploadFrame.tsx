import { useId, useState } from "react";
import type { FormEvent, ReactNode, Ref } from "react";
import { ChevronDown, Tv } from "lucide-react";
import type { SubmissionKind } from "@/entities/submission";
import { KIND_STYLE } from "@/entities/submission/ui/kind-style";
import { BackLink, IconTile } from "@/shared/components";
import { cn } from "@/shared/lib/utils";

/**
 * 콘텐츠 올리기 화면의 공통 틀. 포스터·이벤트 배너·소식 제보가 모두 이 틀을 쓴다.
 *
 * 위에 돌아가기와 제목, 왼쪽에 입력 칸, 오른쪽에 화면을 따라 내려오는 TV 미리보기.
 * 제출 줄은 입력 칸 아래에 붙어 있다가 입력이 길어지면 화면 아래에 고정된다. 휴대폰에서는
 * 미리보기가 입력 위에 접혀 있고, 필요할 때 펼친다.
 */
interface UploadFrameProps {
  kind: SubmissionKind;
  back: { to: string; label: string };
  title: string;
  description: ReactNode;
  /** 입력 칸 맨 위의 상태 안내. 고치는 신청, 고칠 수 없는 신청 등 */
  notice?: ReactNode;
  formId?: string;
  formRef?: Ref<HTMLFormElement>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  /** 입력 칸 */
  children: ReactNode;
  /** 제출 줄 왼쪽의 짧은 정보. 예: 오늘 남은 제보 */
  meta?: ReactNode;
  /** 제출 버튼 */
  submit: ReactNode;
  preview: ReactNode;
  /** 미리보기 아래 한 줄 */
  previewNote?: ReactNode;
}

export function UploadFrame({
  kind,
  back,
  title,
  description,
  notice,
  formId,
  formRef,
  onSubmit,
  children,
  meta,
  submit,
  preview,
  previewNote,
}: UploadFrameProps) {
  const style = KIND_STYLE[kind];

  return (
    <>
      <div>
        <BackLink to={back.to}>{back.label}</BackLink>
        <div className="mt-2 flex items-center gap-3.5">
          <IconTile icon={style.icon} size="lg" className={style.soft} />
          <div className="min-w-0">
            <h1 className="text-display text-ink">{title}</h1>
            <p className="mt-0.5 text-label text-ink-muted">{description}</p>
          </div>
        </div>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] lg:gap-8">
        <form
          ref={formRef}
          id={formId}
          noValidate
          onSubmit={onSubmit}
          className="flex min-w-0 flex-col rounded-block bg-surface ring-1 ring-line lg:col-start-1 lg:row-start-1"
        >
          <div className="flex flex-col gap-6 p-4 sm:p-6">
            {notice}
            {children}
          </div>

          {/* 입력이 길어도 제출 버튼이 화면 안에 있다. 폼 끝에 닿으면 제자리로 돌아온다. */}
          <div className="sticky bottom-0 z-10 flex items-center gap-3 rounded-b-block border-t border-line bg-surface/95 px-4 py-3 backdrop-blur-sm sm:px-6">
            {meta && (
              <div className="min-w-0 text-caption text-ink-muted">{meta}</div>
            )}
            <div className="ml-auto shrink-0">{submit}</div>
          </div>
        </form>

        <PreviewPanel
          note={previewNote}
          className="order-first lg:order-none lg:sticky lg:top-[calc(var(--layout-header-height)+1.5rem)] lg:col-start-2 lg:row-start-1"
        >
          {preview}
        </PreviewPanel>
      </div>
    </>
  );
}

function PreviewPanel({
  children,
  note,
  className,
}: {
  children: ReactNode;
  note?: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const headingId = useId();
  const bodyId = useId();

  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        "min-w-0 rounded-block bg-surface px-4 py-3 ring-1 ring-line",
        "lg:bg-transparent lg:p-0 lg:ring-0",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <Tv
          size={18}
          strokeWidth={2}
          className="text-ink-subtle"
          aria-hidden="true"
        />
        <h2 id={headingId} className="text-subhead text-ink">
          TV 미리보기
        </h2>
        {/* 넓은 화면에서는 늘 펼쳐 둔다. */}
        <button
          type="button"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => setOpen((current) => !current)}
          className={cn(
            "ml-auto inline-flex items-center gap-0.5 rounded-control py-1 pr-1 pl-2 text-label text-ink-muted hover:text-ink lg:hidden",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
          )}
        >
          {open ? "접기" : "펼치기"}
          <ChevronDown
            size={16}
            strokeWidth={2.25}
            aria-hidden="true"
            className={cn("transition-transform", open && "rotate-180")}
          />
        </button>
      </div>
      <div id={bodyId} className={cn("mt-3", !open && "hidden lg:block")}>
        {children}
        {note && <p className="mt-2 text-caption text-ink-muted">{note}</p>}
      </div>
    </section>
  );
}
