import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { to } from "@/app/router/routes";
import { Logo } from "@/components/common/Logo";
import { fromSubmissionView } from "@/entities/poster";
import type { SignageSubmissionExpanded } from "@/entities/submission";
import {
  DisplayPreview,
  draftToPosterRenderModel,
  previewSourceFromNotice,
} from "@/features/display-preview";
import type { PreviewSource } from "@/features/display-preview";
import { PosterDropzone, usePosterUpload } from "@/features/media-upload";
import {
  createEmptyDraft,
  draftFromNotice,
  draftFromSubmission,
  isEditableStatus,
} from "@/features/submissions/create/model/draft";
import type { SubmissionDraft } from "@/features/submissions/create/model/draft";
import { useCreateSubmission } from "@/features/submissions/create/model/use-create-submission";
import { useUnsavedChangesWarning } from "@/features/submissions/create/model/use-unsaved-changes-warning";
import {
  hasFieldErrors,
  summarizeErrors,
  toFormFieldErrors,
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
import { useServerNow } from "@/shared/lib/use-server-now";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { Spinner } from "@/shared/ui/spinner";

/**
 * 게시 신청 (명세 FR-SUB-01 ~ FR-SUB-04).
 *
 * 공지를 연결하고 포스터를 올리고 게시 정보를 입력하면 미리보기가 즉시 따라온다.
 * 미리보기는 TV 플레이어와 같은 컴포넌트라 여기서 보이는 것이 실제 결과다.
 *
 * 넓은 화면은 세 칸(공지·포스터 / 미리보기 / 게시 정보)이고, 좁은 화면은 입력 →
 * 미리보기 순으로 쌓인다. 휴대폰으로 공지를 쓰고 바로 신청하는 경우가 많다.
 *
 * `?submissionId=`가 있으면 수정 모드다. DRAFT는 이어서 작성, REJECTED는 수정 후
 * 재신청이며 둘 다 update → submit 경로를 쓴다. 공지는 이미 신청에 연결되어 있어
 * 다시 고르지 않는다. (명세 FR-DASH-02)
 */
const NOTICE_PARAM = "noticeId";
const EDIT_PARAM = "submissionId";
const FORM_ID = "submission-create-form";

export function StudioPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const noticeId = searchParams.get(NOTICE_PARAM);
  const editingId = searchParams.get(EDIT_PARAM);

  const notice = useZiggleNotice(editingId ? null : noticeId);
  const editing = useSubmissionDetail(editingId);
  const editingSubmission = editingId ? (editing.data ?? null) : null;
  const upload = usePosterUpload();
  const createSubmission = useCreateSubmission();

  // 4분할 미리보기의 나머지 칸을 채울 내 게시 중 포스터와, 판정 기준이 되는 서버 시각.
  const published = useSubmissionViews({ status: "PUBLISHED", limit: 4 });
  const serverNow = useServerNow(
    published.data?.serverTime,
    published.dataUpdatedAt,
  );
  const companions = useMemo(
    () => (published.data?.items ?? []).map(fromSubmissionView),
    [published.data],
  );

  const [draft, setDraft] = useState<SubmissionDraft>(() =>
    createEmptyDraft(new Date()),
  );
  const [showErrors, setShowErrors] = useState(false);
  /** 서버가 422로 돌려준 필드 오류. 클라이언트 검증과 합쳐 입력 칸에 붙인다. */
  const [serverErrors, setServerErrors] = useState<{
    fieldErrors: SubmissionFieldErrors;
    other: string[];
  }>({ fieldErrors: {}, other: [] });
  const [isDirty, setIsDirty] = useState(false);
  const [submitted, setSubmitted] = useState<SignageSubmissionExpanded | null>(
    null,
  );
  const [focusRequest, setFocusRequest] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);

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
    // 수정 모드에서 새 포스터를 고르지 않았을 때만 기존 포스터를 쓴다. 새 포스터가
    // 올라가는 중이거나 실패했으면 비워서, 미리보기와 다른 포스터로 제출되지 않게 한다.
    assetId:
      upload.state.status === "idle"
        ? (editingSubmission?.assetId ?? null)
        : (upload.state.asset?.assetId ?? null),
  };
  const errors: SubmissionFieldErrors = {
    ...validateSubmissionForm(values, { now: serverNow }),
    ...serverErrors.fieldErrors,
  };
  const summary = showErrors
    ? [summarizeErrors(errors), ...serverErrors.other].filter(Boolean).join(" ")
    : "";

  const isBusy =
    createSubmission.isSubmitting ||
    upload.state.status === "uploading" ||
    upload.state.status === "validating";
  /** 접수된 뒤에는 같은 내용을 다시 보낼 수 없다. (명세 FR-SUB-04) */
  const isSubmitted = submitted !== null;
  /** 수정 대상이 제출 전 상태가 아니면 제출 자체를 막는다. */
  const editBlocked =
    editingSubmission !== null && !isEditableStatus(editingSubmission.status);
  const isResubmission = editingSubmission?.status === "REJECTED";
  const blocker = useUnsavedChangesWarning(isDirty && submitted === null);

  const previewSource: PreviewSource | null = editingSubmission
    ? {
        id: editingSubmission.id,
        organizationName: editingSubmission.organizationName,
        subtitle: editingSubmission.subtitle,
        location: editingSubmission.location,
      }
    : notice.data
      ? previewSourceFromNotice(notice.data)
      : null;
  const previewPoster = draftToPosterRenderModel({
    draft,
    source: previewSource,
    posterUrl:
      upload.state.previewUrl ?? editingSubmission?.posterUrl ?? null,
    now: serverNow,
  });

  // 제출이 막히면 첫 문제 칸으로 옮긴다. 제출 버튼은 머리에 있고 오류는 아래에
  // 있어서, 그대로 두면 무엇이 문제인지 찾아 헤매야 한다.
  useEffect(() => {
    if (focusRequest === 0) return;
    const firstInvalid = formRef.current?.querySelector<HTMLElement>(
      '[aria-invalid="true"]',
    );
    (firstInvalid ?? summaryRef.current)?.focus();
    (firstInvalid ?? summaryRef.current)?.scrollIntoView({
      block: "center",
    });
  }, [focusRequest]);

  const markChanged = () => {
    setIsDirty(true);
    // 서버 필드 오류는 입력이 바뀌면 낡은 정보다. 다음 제출에서 다시 판정된다.
    setServerErrors({ fieldErrors: {}, other: [] });
    createSubmission.markInputChanged();
  };

  const patchDraft = (patch: Partial<SubmissionDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
    markChanged();
  };

  /** 다른 공지로 새 신청을 시작한다. 올린 포스터와 입력은 비운다. */
  const startNew = () => {
    filledNoticeIdRef.current = null;
    setSubmitted(null);
    setShowErrors(false);
    setIsDirty(false);
    setServerErrors({ fieldErrors: {}, other: [] });
    upload.clear();
    createSubmission.startOver();
    setDraft(createEmptyDraft(new Date()));
    setSearchParams({});
  };

  const handleSubmit = () => {
    setShowErrors(true);
    if (isBusy || isSubmitted || editBlocked) return;
    if (hasFieldErrors(errors)) {
      setFocusRequest((count) => count + 1);
      return;
    }

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
          setSubmitted(submission);
          setIsDirty(false);
        },
        onError: (error) => {
          // 입력과 업로드는 그대로 둔다. 사용자가 다시 채우지 않고 재시도할 수 있어야 한다.
          if (error.fields) {
            setServerErrors(toFormFieldErrors(error.fields));
            setFocusRequest((count) => count + 1);
          }
          toast.error("신청을 접수하지 못했어요", {
            description: toUserMessage(error),
          });
        },
      },
    );
  };

  const submitLabel = isResubmission ? "다시 신청하기" : "제출하기";

  return (
    <>
      <header className="sticky top-0 z-(--layer-header) flex h-(--layout-header-height) shrink-0 items-center gap-3 border-b border-line bg-surface px-4 sm:gap-4 sm:px-6">
        <Link to={to.dashboard()} className="flex shrink-0">
          <Logo size="md" />
        </Link>
        <div className="hidden h-7 w-px bg-line sm:block" />
        <div className="min-w-0">
          <h1 className="text-heading whitespace-nowrap text-ink">게시 신청</h1>
          <p className="hidden text-caption text-ink-muted sm:block">
            포스터를 올리고 TV 게시판에 게시를 신청합니다
          </p>
        </div>
        <Button
          size="sm"
          type="submit"
          form={FORM_ID}
          disabled={isBusy || isSubmitted || editBlocked}
          className="ml-auto shrink-0"
        >
          {createSubmission.isSubmitting && <Spinner aria-hidden="true" />}
          {submitLabel}
        </Button>
      </header>

      <form
        ref={formRef}
        id={FORM_ID}
        className="flex flex-col lg:min-h-0 lg:flex-1 lg:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          handleSubmit();
        }}
        noValidate
      >
        <aside className="order-1 flex flex-col gap-4 border-b border-line bg-surface p-4 lg:h-full lg:w-75 lg:shrink-0 lg:overflow-y-auto lg:border-r lg:border-b-0">
          {editingId ? (
            <PageState
              isLoading={editing.isPending}
              error={editing.error}
              onRetry={() => void editing.refetch()}
            >
              {editingSubmission &&
                (isEditableStatus(editingSubmission.status) ? (
                  <div className="rounded-card border border-line bg-surface-muted p-3">
                    <p className="text-caption text-ink-subtle">
                      {isResubmission
                        ? "반려된 신청 수정"
                        : "작성 중인 신청 이어서 쓰기"}
                    </p>
                    <p className="mt-0.5 truncate text-label text-ink">
                      {editingSubmission.title}
                    </p>
                    <p className="mt-0.5 text-caption text-ink-muted">
                      제출하면 다시 검토를 받아요
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
              onClearNotice={startNew}
              onRetry={() => void notice.refetch()}
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
                markChanged();
                void upload.selectFile(file);
              }}
              onRetry={upload.retry}
              onClear={() => {
                markChanged();
                upload.clear();
              }}
              error={showErrors ? errors.asset : null}
            />
          </div>
        </aside>

        <aside className="order-2 flex flex-col border-b border-line bg-surface lg:order-3 lg:h-full lg:w-75 lg:shrink-0 lg:overflow-y-auto lg:border-b-0 lg:border-l">
          <div className="border-b border-line px-4 py-3.5">
            <h2 className="text-heading text-ink">게시 정보</h2>
            <p className="mt-0.5 text-caption text-ink-muted">
              제목, 카테고리, 게시 기간을 정하세요
            </p>
          </div>

          <div className="space-y-4 p-4">
            {summary && (
              <div ref={summaryRef} tabIndex={-1} className="outline-none">
                <Alert variant="destructive">
                  <AlertTriangle aria-hidden="true" />
                  <AlertDescription>
                    {summary}
                    {errors.notice && ` ${errors.notice}`}
                  </AlertDescription>
                </Alert>
              </div>
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

        <main className="order-3 flex min-w-0 flex-col bg-canvas lg:order-2 lg:flex-1">
          <div className="border-b border-line bg-surface/60 px-4 py-3 backdrop-blur">
            <p className="text-center text-caption text-ink-muted">
              TV 표시 미리보기 · 입력하는 대로 바로 반영됩니다
            </p>
          </div>
          <div className="flex flex-1 items-center justify-center p-4 sm:p-6 lg:overflow-y-auto">
            <DisplayPreview
              poster={previewPoster}
              companions={companions}
              serverTime={serverNow}
            />
          </div>
        </main>
      </form>

      <SubmitSuccessDialog
        submission={submitted}
        isResubmission={editingSubmission !== null}
        onStartNew={startNew}
        onOpenDetail={() => {
          if (!submitted) return;
          const id = submitted.id;
          setSubmitted(null);
          void navigate(to.submissionDetail(id), { replace: true });
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
