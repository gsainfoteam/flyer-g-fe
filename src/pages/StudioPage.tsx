import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { to } from "@/app/router/routes";
import { Logo } from "@/components/common/Logo";
import { fromSubmissionView } from "@/entities/poster";
import type { SignageSubmissionExpanded } from "@/entities/submission";
import { DisplayPreview, draftToPosterRenderModel } from "@/features/display-preview";
import { PosterDropzone, usePosterUpload } from "@/features/media-upload";
import {
  createEmptyDraft,
  draftFromNotice,
  draftFromSubmission,
} from "@/features/submissions/create/model/draft";
import type { SubmissionDraft } from "@/features/submissions/create/model/draft";
import { useCreateSubmission } from "@/features/submissions/create/model/use-create-submission";
import { useUnsavedChangesWarning } from "@/features/submissions/create/model/use-unsaved-changes-warning";
import {
  hasFieldErrors,
  summarizeErrors,
  validateSubmissionForm,
} from "@/features/submissions/create/model/validate";
import type { SubmissionFieldErrors } from "@/features/submissions/create/model/validate";
import { NoticePanel } from "@/features/submissions/create/ui/NoticePanel";
import { SubmissionForm } from "@/features/submissions/create/ui/SubmissionForm";
import { SubmitSuccessDialog } from "@/features/submissions/create/ui/SubmitSuccessDialog";
import {
  useSubmissionDetail,
  useSubmissionViews,
} from "@/features/submissions/api/queries";
import { useZiggleNotice } from "@/features/ziggle-notice/api/queries";
import { ConfirmActionDialog, PageState } from "@/shared/components";
import { toUserMessage } from "@/shared/api/error";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { Spinner } from "@/shared/ui/spinner";

/**
 * 게시 신청 (명세 FR-SUB-01 ~ FR-SUB-04).
 *
 * 왼쪽에서 공지를 연결하고 포스터를 올리고, 오른쪽에서 게시 정보를 입력하면
 * 가운데 미리보기가 즉시 따라온다. 미리보기는 TV 플레이어와 같은 컴포넌트라
 * 여기서 보이는 것이 실제 결과다.
 *
 * `?submissionId=`가 있으면 수정 모드다. DRAFT는 이어서 작성, REJECTED는 수정 후
 * 재신청이며 둘 다 update → submit 경로를 쓴다. 공지는 이미 신청에 연결되어 있어
 * 다시 고르지 않는다. (명세 FR-DASH-02)
 */
const NOTICE_PARAM = "noticeId";
const EDIT_PARAM = "submissionId";
const FORM_ID = "submission-create-form";

const EDITABLE_STATUSES = ["DRAFT", "REJECTED"] as const;

export function StudioPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const noticeId = searchParams.get(NOTICE_PARAM);
  const editingId = searchParams.get(EDIT_PARAM);

  const notice = useZiggleNotice(editingId ? null : noticeId);
  const editing = useSubmissionDetail(editingId);
  const editingSubmission = editingId ? (editing.data ?? null) : null;
  const upload = usePosterUpload();
  const createSubmission = useCreateSubmission();

  // 4분할 미리보기를 채울 실제 게시 중 포스터와, 판정 기준이 되는 서버 시각.
  const published = useSubmissionViews({ status: "PUBLISHED", limit: 4 });
  const serverTime = published.data?.serverTime ?? new Date();
  const companions = useMemo(
    () => (published.data?.items ?? []).map(fromSubmissionView),
    [published.data],
  );

  const [draft, setDraft] = useState<SubmissionDraft>(() =>
    createEmptyDraft(new Date()),
  );
  const [showErrors, setShowErrors] = useState(false);
  /** 서버가 422로 돌려준 필드 오류. 클라이언트 검증과 합쳐 입력 칸에 붙인다. */
  const [serverFieldErrors, setServerFieldErrors] =
    useState<SubmissionFieldErrors>({});
  const [isDirty, setIsDirty] = useState(false);
  const [created, setCreated] = useState<SignageSubmissionExpanded | null>(null);

  // 공지·기존 신청이 도착하면 한 번만 채운다. 사용자가 고친 제목을 덮어쓰지 않는다.
  const filledNoticeIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (editingId) return;
    const loaded = notice.data;
    if (!loaded || filledNoticeIdRef.current === loaded.id) return;
    filledNoticeIdRef.current = loaded.id;
    setDraft(draftFromNotice(loaded, new Date()));
  }, [notice.data, editingId]);

  const filledEditIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!editingSubmission || filledEditIdRef.current === editingSubmission.id)
      return;
    filledEditIdRef.current = editingSubmission.id;
    setDraft(draftFromSubmission(editingSubmission));
  }, [editingSubmission]);

  const values = {
    ...draft,
    ziggleNoticeId: editingSubmission
      ? editingSubmission.ziggleNoticeId
      : (notice.data?.id ?? null),
    // 수정 모드에서 새 포스터를 올리지 않으면 기존 포스터를 그대로 쓴다.
    assetId:
      upload.state.asset?.assetId ??
      (editingSubmission ? editingSubmission.assetId : null),
  };
  const errors: SubmissionFieldErrors = {
    ...validateSubmissionForm(values, { now: serverTime }),
    ...serverFieldErrors,
  };
  const summary = showErrors ? summarizeErrors(errors) : null;

  const isBusy =
    createSubmission.isSubmitting || upload.state.status === "uploading";
  /** 접수된 뒤에는 같은 내용을 다시 보낼 수 없다. (명세 FR-SUB-04) */
  const isSubmitted = created !== null;
  /** 수정 대상이 제출 전 상태가 아니면 제출 자체를 막는다. */
  const editBlocked =
    editingId !== null &&
    editingSubmission !== null &&
    !EDITABLE_STATUSES.includes(
      editingSubmission.status as (typeof EDITABLE_STATUSES)[number],
    );
  const blocker = useUnsavedChangesWarning(isDirty && created === null);

  const previewPoster = draftToPosterRenderModel({
    draft,
    notice: notice.data ?? null,
    posterUrl:
      upload.state.previewUrl ?? editingSubmission?.posterUrl ?? null,
    now: serverTime,
  });

  const patchDraft = (patch: Partial<SubmissionDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
    setIsDirty(true);
    // 서버 필드 오류는 입력이 바뀌면 낡은 정보다. 다음 제출에서 다시 판정된다.
    setServerFieldErrors({});
    // 입력이 바뀌면 다른 시도다. 앞선 시도의 idempotency key를 재사용하지 않는다.
    createSubmission.resetAttempt();
  };

  const handleSubmit = () => {
    setShowErrors(true);
    if (hasFieldErrors(errors) || isBusy || isSubmitted || editBlocked) return;

    createSubmission.submit(
      {
        ziggleNoticeId: values.ziggleNoticeId!,
        title: values.title,
        categoryId: values.categoryId,
        assetId: values.assetId!,
        detailUrl: values.detailUrl,
        startAt: values.startAt,
        endAt: values.endAt,
        editing: editingSubmission
          ? {
              submissionId: editingSubmission.id,
              version: editingSubmission.version,
            }
          : undefined,
      },
      {
        onSuccess: (submission) => {
          setCreated(submission);
          setIsDirty(false);
          toast.success("게시 신청이 접수되었어요", {
            description: `신청 ID ${submission.id}`,
          });
        },
        onError: (error) => {
          // 입력과 업로드는 그대로 둔다. 사용자가 다시 채우지 않고 재시도할 수 있어야 한다.
          if (error.fields) {
            setServerFieldErrors(error.fields as SubmissionFieldErrors);
          }
          toast.error("신청을 접수하지 못했어요", {
            description: toUserMessage(error),
          });
        },
      },
    );
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
            <Link to={to.display("device-preview", { preview: true })}>
              TV 미리보기
            </Link>
          </Button>
          <Button
            size="sm"
            type="submit"
            form={FORM_ID}
            disabled={isBusy || isSubmitted || editBlocked}
          >
            {createSubmission.isSubmitting && <Spinner aria-hidden="true" />}
            제출하기
          </Button>
        </div>
      </header>

      <form
        id={FORM_ID}
        className="flex min-h-0 flex-1"
        onSubmit={(event) => {
          event.preventDefault();
          handleSubmit();
        }}
        noValidate
      >
        <aside className="flex h-full w-[300px] shrink-0 flex-col gap-4 overflow-y-auto border-r border-line bg-surface p-4">
          {editingId ? (
            <PageState
              isLoading={editing.isPending}
              error={editing.error}
              onRetry={() => void editing.refetch()}
            >
              {editingSubmission &&
                (EDITABLE_STATUSES.includes(
                  editingSubmission.status as (typeof EDITABLE_STATUSES)[number],
                ) ? (
                  <div className="rounded-card border border-line bg-surface-muted p-3">
                    <p className="text-caption text-ink-subtle">
                      {editingSubmission.status === "REJECTED"
                        ? "반려된 신청 수정"
                        : "작성 중인 신청 이어서 쓰기"}
                    </p>
                    <p className="mt-0.5 truncate text-label text-ink">
                      {editingSubmission.title}
                    </p>
                    <p className="mt-0.5 truncate text-caption text-ink-muted">
                      v{editingSubmission.version} · 제출하면 다시 검토를
                      받아요
                    </p>
                  </div>
                ) : (
                  <Alert variant="destructive">
                    <AlertTriangle aria-hidden="true" />
                    <AlertDescription className="space-y-2">
                      <span>
                        지금 상태에서는 수정할 수 없어요. 제출 전(작성 중·반려)
                        신청만 고칠 수 있습니다.
                      </span>
                      <Button variant="secondary" size="sm" asChild>
                        <Link to={to.submissionDetail(editingSubmission.id)}>
                          신청 상세로
                        </Link>
                      </Button>
                    </AlertDescription>
                  </Alert>
                ))}
            </PageState>
          ) : (
            <NoticePanel
              notice={notice.data ?? null}
              noticeId={noticeId}
              isLoading={notice.isPending && noticeId !== null}
              error={notice.error}
              onSelectNotice={(id) => {
                setSearchParams({ [NOTICE_PARAM]: id });
              }}
              onClearNotice={() => {
                filledNoticeIdRef.current = null;
                setSearchParams({});
                setDraft(createEmptyDraft(new Date()));
                createSubmission.resetAttempt();
              }}
            />
          )}

          <div>
            <h2 className="text-label text-ink">포스터</h2>
            <p className="mt-0.5 mb-2 text-caption text-ink-muted">
              {editingSubmission && !upload.state.previewUrl
                ? "기존 포스터를 그대로 쓰거나 새로 올려서 바꿀 수 있어요"
                : "세로 3:4 비율을 권장합니다"}
            </p>
            {editingSubmission?.posterUrl && !upload.state.previewUrl && (
              <div className="mb-3 overflow-hidden rounded-control ring-1 ring-line">
                <div className="aspect-3/4 w-full bg-surface-muted">
                  <img
                    src={editingSubmission.posterUrl}
                    alt="현재 포스터"
                    className="h-full w-full object-cover"
                  />
                </div>
                <p className="bg-surface px-2.5 py-1.5 text-caption text-ink-muted">
                  현재 포스터
                </p>
              </div>
            )}
            <PosterDropzone
              state={upload.state}
              onSelectFile={(file) => {
                setIsDirty(true);
                createSubmission.resetAttempt();
                void upload.selectFile(file);
              }}
              onRetry={upload.retry}
              onClear={() => {
                createSubmission.resetAttempt();
                upload.clear();
              }}
              error={showErrors ? errors.asset : null}
            />
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col bg-canvas">
          <div className="border-b border-line bg-surface/60 px-4 py-3 backdrop-blur">
            <p className="text-center text-caption text-ink-muted">
              TV 표시 미리보기 · 입력하는 대로 바로 반영됩니다
            </p>
          </div>
          <div className="flex flex-1 items-center justify-center overflow-y-auto p-6">
            <DisplayPreview
              poster={previewPoster}
              companions={companions}
              serverTime={serverTime}
            />
          </div>
        </main>

        <aside className="flex h-full w-[300px] shrink-0 flex-col overflow-y-auto border-l border-line bg-surface">
          <div className="border-b border-line px-4 py-3.5">
            <h2 className="text-heading text-ink">게시 정보</h2>
            <p className="mt-0.5 text-caption text-ink-muted">
              제목, 기간, 링크를 입력하세요
            </p>
          </div>

          <div className="space-y-4 p-4">
            {summary && (
              <Alert variant="destructive">
                <AlertTriangle aria-hidden="true" />
                <AlertDescription>
                  {summary}
                  {errors.notice && ` ${errors.notice}`}
                </AlertDescription>
              </Alert>
            )}

            <SubmissionForm
              draft={draft}
              errors={errors}
              showErrors={showErrors}
              disabled={createSubmission.isSubmitting}
              onChange={patchDraft}
            />
          </div>
        </aside>
      </form>

      <SubmitSuccessDialog
        submission={created}
        onClose={() => {
          // 접수된 내용을 그대로 두면 같은 신청을 한 번 더 보내게 된다. 비우고 시작한다.
          setCreated(null);
          setShowErrors(false);
          upload.clear();
          setDraft(
            notice.data
              ? draftFromNotice(notice.data, new Date())
              : createEmptyDraft(new Date()),
          );
        }}
      />

      <ConfirmActionDialog
        open={blocker.state === "blocked"}
        onOpenChange={(open) => {
          if (!open) blocker.reset?.();
        }}
        title="작성 중인 신청을 두고 나갈까요?"
        description="올린 포스터와 입력한 내용은 저장되지 않습니다."
        confirmLabel="나가기"
        cancelLabel="계속 작성"
        tone="destructive"
        onConfirm={() => blocker.proceed?.()}
      />
    </>
  );
}
