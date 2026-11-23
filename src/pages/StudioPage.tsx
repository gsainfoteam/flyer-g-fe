import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { to } from "@/shared/config/routes";
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
import { UploadFrame } from "@/widgets/upload/UploadFrame";

/**
 * 게시 신청 (명세 FR-SUB-01 ~ FR-SUB-04).
 *
 * 포스터를 올리고 게시 정보를 입력하면 미리보기가 즉시 따라온다. 미리보기는 TV
 * 플레이어와 같은 컴포넌트라 여기서 보이는 것이 실제 결과다.
 *
 * 이벤트 배너·소식 제보와 같은 틀(`UploadFrame`)이다. 왼쪽에 포스터와 게시 정보, 오른쪽에
 * 미리보기. 휴대폰으로 바로 신청하는 경우가 많아서 좁은 화면에서는 미리보기를 접어 둔다.
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
      note: "제출 후 재검토",
      submitLabel: status === "DRAFT" ? "심사 요청" : "고쳐서 다시 내기",
    };
  }
  if (needsReapproval(status)) {
    return {
      caption: "예약된 신청 수정",
      note: "수정 후 재승인 필요",
      submitLabel: "다시 승인 받기",
    };
  }
  return {
    caption: "검토 대기 중인 신청 수정",
    note: "수정 후에도 검토 대기 순서 유지",
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
            // 영상을 연 환경이면 허용 형식에 video/*가 들어 있다(배포 ①).
            acceptsVideo: config.data.allowedMimeTypes.some((type) =>
              type.startsWith("video/"),
            ),
            maxVideoSizeBytes: config.data.maxVideoUploadBytes,
            maxVideoDurationSeconds: config.data.maxVideoDurationSeconds,
          }
        : null,
    [config.data],
  );
  const upload = usePosterUpload({ limits: uploadLimits });
  const createSubmission = useCreateSubmission();

  // 벽·띠 미리보기의 나머지 자리를 채울 게시 중 포스터와, 판정 기준이 되는 서버 시각.
  // 편성 v1은 포스터만 띄우므로 이웃 자리도 포스터로만 채운다.
  const published = useSubmissionViews({
    status: "PUBLISHED",
    types: ["POSTER"],
    limit: 7,
  });
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
  /**
   * 고치는 신청의 지금 상태. 저장된 값이 아니라 서버 시각 기준이다 — 시작 시각이
   * 지난 예약 건은 이미 게시 중이라 고칠 수 없다.
   */
  const editingStatus = editingSubmission
    ? serverNow
      ? resolveEffectiveStatus(editingSubmission, serverNow)
      : editingSubmission.status
    : null;
  /** 고치는 신청의 원래 기간. 기간을 바꿨는지로 기간 규칙을 다시 볼지 정한다. */
  const originalSchedule = useMemo(() => {
    if (!editingSubmission) return null;
    const { startAt, endAt } = draftFromSubmission(editingSubmission);
    return { startAt, endAt };
  }, [editingSubmission]);
  const errors: SubmissionFieldErrors = {
    ...validateSubmissionForm(values, {
      now: serverNow,
      config: config.data ?? null,
      categories: categories.data ?? null,
      editing:
        editingStatus && originalSchedule
          ? { status: editingStatus, schedule: originalSchedule }
          : null,
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
  /** 게시가 시작되었거나 끝난 신청은 제출 자체를 막는다. */
  const editBlocked =
    editingStatus !== null && !canSubmitterEdit(editingStatus);
  const editingCopy =
    editingStatus && !editBlocked ? describeEditing(editingStatus) : null;
  const blocker = useUnsavedChangesWarning(isDirty && submitted === null);

  // 새로 고른 영상은 대표 프레임이 아직 없어 영상만 그린다. 올리고 나면 서버가 뜬
  // 프레임을 쓴다.
  const pickedVideo =
    upload.state.mediaKind === "VIDEO" ? upload.state.previewUrl : null;
  const previewPoster = draftToPosterRenderModel({
    draft,
    submissionId: editingSubmission?.id ?? null,
    categories: categories.data ?? [],
    posterUrl: pickedVideo
      ? (upload.state.asset?.url ?? null)
      : (upload.state.previewUrl ?? editingSubmission?.posterUrl ?? null),
    video: upload.state.previewUrl
      ? pickedVideo
        ? { url: pickedVideo, durationMs: upload.state.durationMs }
        : null
      : editingSubmission?.posterVideoUrl
        ? {
            url: editingSubmission.posterVideoUrl,
            durationMs: editingSubmission.posterDurationMs,
          }
        : null,
    posterSize: upload.state.previewUrl
      ? upload.state.dimensions
      : editingSubmission
        ? {
            width: editingSubmission.posterWidth ?? 0,
            height: editingSubmission.posterHeight ?? 0,
          }
        : null,
    now: serverNow,
  });

  // 제출이 막히면 첫 문제 칸으로 옮긴다. 제출 버튼은 화면 아래에 고정돼 있고 오류 칸은
  // 위에 있을 수 있어서, 그대로 두면 무엇이 문제인지 찾아 헤매야 한다.
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
        editing:
          editingSubmission && originalSchedule
            ? {
                submissionId: editingSubmission.id,
                version: editingSubmission.version,
                schedule: originalSchedule,
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
          toast.error("신청을 접수하지 못했습니다", {
            description: toUserMessage(error),
          });
        },
      },
    );
  };

  const submitLabel = editingCopy?.submitLabel ?? "심사 요청";

  return (
    <>
      <UploadFrame
        kind="POSTER"
        back={
          editingId
            ? { to: to.submissionDetail(editingId), label: "콘텐츠 상세" }
            : { to: to.home(), label: "홈" }
        }
        title={editingCopy ? "포스터 고치기" : "포스터 올리기"}
        description="심사 후 기숙사 로비 TV에 게시"
        formId={FORM_ID}
        formRef={formRef}
        onSubmit={(event) => {
          event.preventDefault();
          handleSubmit();
        }}
        notice={
          editingId && (
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
                        현재 상태에서는 수정할 수 없습니다. 게시가 시작되기
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
          )
        }
        submit={
          <Button
            type="submit"
            disabled={isBusy || isSubmitted || editBlocked}
          >
            {createSubmission.isSubmitting && <Spinner aria-hidden="true" />}
            {submitLabel}
          </Button>
        }
        preview={
          <DisplayPreview
            poster={previewPoster}
            companions={companions}
            serverTime={serverNow}
          />
        }
      >
        {summary && (
          <div ref={summaryRef} tabIndex={-1} className="outline-none">
            <Alert variant="destructive">
              <AlertTriangle aria-hidden="true" />
              <AlertDescription>{summary}</AlertDescription>
            </Alert>
          </div>
        )}

        <section aria-labelledby="poster-media" className="space-y-2">
          <div>
            <h2 id="poster-media" className="text-subhead text-ink">
              포스터
            </h2>
            <p className="mt-0.5 text-caption text-ink-muted">
              {editingSubmission && !upload.state.previewUrl
                ? "기존 포스터 유지 또는 새 파일로 교체"
                : uploadLimits?.acceptsVideo
                  ? "세로 포스터·정사각형 사진·가로 배너·짧은 영상 업로드 가능"
                  : "세로 포스터·정사각형 사진·가로 배너 업로드 가능"}
            </p>
          </div>
          {editingSubmission?.posterUrl && !upload.state.previewUrl && (
            <div className="flex items-center gap-3 rounded-control bg-surface-muted p-2">
              <img
                src={editingSubmission.posterUrl}
                alt="현재 포스터"
                className="h-16 w-12 rounded-md bg-surface object-contain"
              />
              <span className="text-caption text-ink-muted">현재 포스터</span>
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
        </section>

        <section
          aria-labelledby="poster-info"
          className="space-y-4 border-t border-line pt-6"
        >
          <div>
            <h2 id="poster-info" className="text-subhead text-ink">
              게시 정보
            </h2>
            <p className="mt-0.5 text-caption text-ink-muted">
              제목·카테고리·게시 기간
            </p>
          </div>
          <SubmissionForm
            draft={draft}
            errors={errors}
            showErrors={showErrors}
            categories={categories.data ?? []}
            config={config.data ?? null}
            disabled={createSubmission.isSubmitting}
            onChange={patchDraft}
          />
        </section>
      </UploadFrame>

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
        title="작성 화면을 나가시겠습니까?"
        description="올린 포스터와 입력한 내용은 저장되지 않습니다."
        confirmLabel="나가기"
        cancelLabel="계속 작성"
        tone="destructive"
        onConfirm={() => blocker.proceed?.()}
      />
    </>
  );
}
