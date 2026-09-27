import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { to } from "@/shared/config/routes";
import { Logo } from "@/shared/components/Logo";
import { fromSubmissionView } from "@/entities/poster";
import {
  canSubmitterEdit,
  canSubmitterResubmit,
  needsReapproval,
  resolveEffectiveStatus,
} from "@/entities/submission";
import type {
  SignageSubmissionExpanded,
  SubmissionStatus,
} from "@/entities/submission";
import {
  useCategories,
  useSignageConfig,
} from "@/entities/submission/api/queries";
import { DisplayPreview } from "@/features/display-preview";
import { draftToPosterRenderModel } from "@/features/submissions/create/model/draft-to-poster";
import { PosterDropzone, usePosterUpload } from "@/features/media-upload";
import {
  createEmptyDraft,
  draftFromSubmission,
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
import { SubmissionForm } from "@/features/submissions/create/ui/SubmissionForm";
import { SubmitSuccessDialog } from "@/features/submissions/create/ui/SubmitSuccessDialog";
import type { SubmitResultKind } from "@/features/submissions/create/ui/SubmitSuccessDialog";
import {
  useSubmissionDetail,
  useSubmissionViews,
} from "@/features/submissions/api/queries";
import { ConfirmActionDialog, PageState } from "@/shared/components";
import { toUserMessage } from "@/shared/api/error";
import { useServerNow } from "@/shared/lib/use-server-now";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { Spinner } from "@/shared/ui/spinner";

/**
 * 게시 신청 (명세 FR-SUB-01 ~ FR-SUB-04).
 *
 * 포스터를 올리고 게시 정보를 입력하면 미리보기가 즉시 따라온다. 미리보기는 TV
 * 플레이어와 같은 컴포넌트라 여기서 보이는 것이 실제 결과다.
 *
 * 넓은 화면은 세 칸(포스터 / 미리보기 / 게시 정보)이고, 좁은 화면은 입력 →
 * 미리보기 순으로 쌓인다. 휴대폰으로 바로 신청하는 경우가 많다.
 *
 * `?submissionId=`가 있으면 수정 모드다. 저장하면 상태에 따라 이어진다
 * (`API-CHANGES-BACKEND.md` 5.6): 반려·중단은 다시 검토를 요청하고, 검토 대기는 그대로
 * 대기이며, 게시 시작 전 승인 건은 다시 승인을 받는다. 게시가 시작되면 고칠 수 없다.
 */
const EDIT_PARAM = "submissionId";
const FORM_ID = "submission-create-form";

/** 고치는 신청의 상태별 안내 */
function describeEditing(status: SubmissionStatus): {
  caption: string;
  note: string;
  submitLabel: string;
} {
  if (canSubmitterResubmit(status)) {
    return {
      caption:
        status === "DRAFT"
          ? "작성 중인 신청 이어서 쓰기"
          : status === "SUSPENDED"
            ? "중단된 신청 수정"
            : "반려된 신청 수정",
      note: "제출하면 다시 검토를 받아요",
      submitLabel: status === "DRAFT" ? "제출하기" : "다시 신청하기",
    };
  }
  if (needsReapproval(status)) {
    return {
      caption: "예약된 신청 수정",
      note: "고치면 다시 승인을 받아야 게시돼요",
      submitLabel: "다시 승인 받기",
    };
  }
  return {
    caption: "검토 대기 중인 신청 수정",
    note: "고쳐도 검토 대기 순서는 그대로예요",
    submitLabel: "수정 저장",
  };
}

export function StudioPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const editingId = searchParams.get(EDIT_PARAM);

  const editing = useSubmissionDetail(editingId);
  const editingSubmission = editingId ? (editing.data ?? null) : null;
  const config = useSignageConfig();
  const categories = useCategories();
  const uploadLimits = useMemo(
    () =>
      config.data
        ? {
            maxSizeBytes: config.data.maxUploadBytes,
            minShortEdgePx: config.data.minShortEdgePx,
          }
        : null,
    [config.data],
  );
  const upload = usePosterUpload({ limits: uploadLimits });
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
  /**
   * 접수된 신청과 결과 종류. 종류는 제출한 순간의 상태로 정한다 — 접수 뒤 목록을
   * 새로 받으면 고치던 신청이 이미 검토 대기로 바뀌어 있다.
   */
  const [submitted, setSubmitted] = useState<{
    submission: SignageSubmissionExpanded;
    kind: SubmitResultKind;
  } | null>(null);
  const [focusRequest, setFocusRequest] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);

  // 기존 신청이 도착하면 한 번만 채운다. 사용자가 고친 입력을 덮어쓰지 않는다.
  const filledEditIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!editingSubmission || filledEditIdRef.current === editingSubmission.id)
      return;
    filledEditIdRef.current = editingSubmission.id;
    setDraft(draftFromSubmission(editingSubmission));
  }, [editingSubmission]);

  const values = {
    ...draft,
    // 수정 모드에서 새 포스터를 고르지 않았을 때만 기존 포스터를 쓴다. 새 포스터가
    // 올라가는 중이거나 실패했으면 비워서, 미리보기와 다른 포스터로 제출되지 않게 한다.
    assetId:
      upload.state.status === "idle"
        ? (editingSubmission?.assetId ?? null)
        : (upload.state.asset?.assetId ?? null),
  };
  const errors: SubmissionFieldErrors = {
    ...validateSubmissionForm(values, {
      now: serverNow,
      config: config.data ?? null,
      categories: categories.data ?? null,
    }),
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
  /**
   * 고치는 신청의 지금 상태. 저장된 값이 아니라 서버 시각 기준이다 — 시작 시각이
   * 지난 예약 건은 이미 게시 중이라 고칠 수 없다.
   */
  const editingStatus = editingSubmission
    ? serverNow
      ? resolveEffectiveStatus(editingSubmission, serverNow)
      : editingSubmission.status
    : null;
  /** 게시가 시작되었거나 끝난 신청은 제출 자체를 막는다. */
  const editBlocked =
    editingStatus !== null && !canSubmitterEdit(editingStatus);
  const editingCopy =
    editingStatus && !editBlocked ? describeEditing(editingStatus) : null;
  const blocker = useUnsavedChangesWarning(isDirty && submitted === null);

  const previewPoster = draftToPosterRenderModel({
    draft,
    submissionId: editingSubmission?.id ?? null,
    categories: categories.data ?? [],
    posterUrl: upload.state.previewUrl ?? editingSubmission?.posterUrl ?? null,
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

  /** 새 신청을 처음부터 시작한다. 올린 포스터와 입력은 비운다. */
  const startNew = () => {
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

    const kind: SubmitResultKind = !editingStatus
      ? "created"
      : canSubmitterResubmit(editingStatus)
        ? "resubmitted"
        : "updated";
    createSubmission.submit(
      {
        ...draft,
        assetId: values.assetId!,
        editing: editingSubmission
          ? {
              submissionId: editingSubmission.id,
              version: editingSubmission.version,
            }
          : undefined,
      },
      {
        onSuccess: (submission) => {
          setSubmitted({ submission, kind });
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

  const submitLabel = editingCopy?.submitLabel ?? "제출하기";

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
          {editingId && (
            <PageState
              isLoading={editing.isPending}
              error={editing.error}
              onRetry={() => void editing.refetch()}
            >
              {editingSubmission &&
                (editingCopy && !editBlocked ? (
                  <div className="rounded-card border border-line bg-surface-muted p-3">
                    <p className="text-caption text-ink-subtle">
                      {editingCopy.caption}
                    </p>
                    <p className="mt-0.5 truncate text-label text-ink">
                      {editingSubmission.title}
                    </p>
                    <p className="mt-0.5 text-caption text-ink-muted">
                      {editingCopy.note}
                    </p>
                  </div>
                ) : (
                  <Alert variant="destructive">
                    <AlertTriangle aria-hidden="true" />
                    <AlertDescription className="space-y-2">
                      <span>
                        지금 상태에서는 수정할 수 없어요. 게시가 시작되기
                        전까지만 고칠 수 있습니다.
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
              limits={uploadLimits}
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
                  <AlertDescription>{summary}</AlertDescription>
                </Alert>
              </div>
            )}

            <SubmissionForm
              draft={draft}
              errors={errors}
              showErrors={showErrors}
              categories={categories.data ?? []}
              config={config.data ?? null}
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
        submission={submitted?.submission ?? null}
        kind={submitted?.kind ?? "created"}
        onStartNew={startNew}
        onOpenDetail={() => {
          if (!submitted) return;
          const id = submitted.submission.id;
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
