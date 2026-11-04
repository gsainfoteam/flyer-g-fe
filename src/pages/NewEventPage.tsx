import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import { EventScene, SceneFrame } from "@/entities/scene";
import { useSignageConfig } from "@/entities/submission/api/queries";
import {
  EVENT_BANNER_TEXT_LIMITS,
  checkEventBanner,
} from "@/entities/submission/model/content-rules";
import type { EventBannerValues } from "@/entities/submission/model/content-rules";
import {
  EVENT_BANNER_OCCASIONS,
  EVENT_BANNER_OCCASION_LABELS,
} from "@/entities/submission/model/types";
import type {
  EventBannerMode,
  EventBannerOccasion,
} from "@/entities/submission/model/types";
import { PosterDropzone, usePosterUpload } from "@/features/media-upload";
import { useSubmissionDetail } from "@/features/submissions/api/queries";
import {
  useCreateContent,
  useUpdateEventBanner,
} from "@/features/submissions/create/model/use-create-content";
import type { SignageSubmissionExpanded } from "@/entities/submission";
import {
  ChoicePills,
  FormField,
  PageState,
  PillField,
} from "@/shared/components";
import { toUserMessage } from "@/shared/api/error";
import type { ApiError } from "@/shared/api/error";
import { to } from "@/shared/config/routes";
import {
  formatSeoulDayRange,
  fromSeoulInput,
  seoulDayCount,
  toSeoulDateInputValue,
} from "@/shared/lib/datetime";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Spinner } from "@/shared/ui/spinner";
import { Textarea } from "@/shared/ui/textarea";

/**
 * 이벤트 배너 만들기 (기획 2-1, 배포 ③).
 *
 * 문구로 만들기: 종류·받는 사람·문구·보낸 사람을 쓰면 TV 화면이 만들어진다. 사진은
 * 한 장까지, 넣으면 사진 속 사람의 동의를 확인한다. 이미지 올리기: 직접 만든 배너
 * 이미지를 그대로 띄운다. 기간은 하루 단위(서울 자정부터)로 최대 `eventBannerMaxDays`일,
 * 당일 신청도 된다. 오른쪽은 실제 TV 장면의 미리보기다.
 */
const DAY_MS = 24 * 60 * 60 * 1000;

const OCCASION_OPTIONS = EVENT_BANNER_OCCASIONS.map((occasion) => ({
  value: occasion,
  label: EVENT_BANNER_OCCASION_LABELS[occasion],
}));

const MODES: { value: EventBannerMode; label: string }[] = [
  { value: "TEMPLATE", label: "문구로 만들기" },
  { value: "IMAGE", label: "이미지 올리기" },
];

const EDIT_PARAM = "submissionId";

export function NewEventPage() {
  const [searchParams] = useSearchParams();
  const editingId = searchParams.get(EDIT_PARAM);
  const editing = useSubmissionDetail(editingId);

  if (!editingId) return <EventBannerForm editing={null} />;
  return (
    <PageState
      isLoading={editing.isPending}
      error={editing.error}
      onRetry={() => void editing.refetch()}
      loadingRows={5}
    >
      {editing.data && (
        <EventBannerForm key={editing.data.id} editing={editing.data} />
      )}
    </PageState>
  );
}

/** 저장된 배너를 폼 값으로. 고치기는 있던 사진·이미지를 그대로 쓰다가 바꾸면 새것을 쓴다. */
function initialOf(editing: SignageSubmissionExpanded | null) {
  const banner = editing?.eventBanner ?? null;
  const start = editing?.startAt ?? null;
  const end = editing?.endAt ?? null;
  return {
    mode: banner?.mode ?? ("TEMPLATE" as EventBannerMode),
    occasion: banner?.occasion ?? null,
    recipient: banner?.recipient ?? "",
    headline: banner?.headline ?? "",
    sender: banner?.sender ?? "",
    message: banner?.message ?? "",
    photoConsent: banner?.photoConsent ?? false,
    startDate: toSeoulDateInputValue(start ?? new Date()),
    days: start && end ? seoulDayCount(start, end) : 1,
    photo:
      banner?.photoAssetId && banner.photoUrl
        ? { id: banner.photoAssetId, url: banner.photoUrl }
        : null,
    image:
      banner?.assetId && banner.assetUrl
        ? { id: banner.assetId, url: banner.assetUrl }
        : null,
  };
}

function EventBannerForm({
  editing,
}: {
  editing: SignageSubmissionExpanded | null;
}) {
  const navigate = useNavigate();
  const config = useSignageConfig();
  const create = useCreateContent();
  const update = useUpdateEventBanner();
  const [initial] = useState(() => initialOf(editing));
  const returned =
    editing?.status === "REJECTED" || editing?.status === "SUSPENDED";
  const uploadLimits = useMemo(
    () => (config.data ? { maxSizeBytes: config.data.maxUploadBytes } : null),
    [config.data],
  );
  // 배너에는 영상을 쓰지 않는다. 사진과 배너 이미지는 업로드 칸을 따로 둔다.
  const photo = usePosterUpload({ limits: uploadLimits });
  const image = usePosterUpload({ limits: uploadLimits });

  const [mode, setMode] = useState<EventBannerMode>(initial.mode);
  const [occasion, setOccasion] = useState<EventBannerOccasion | null>(
    initial.occasion,
  );
  const [recipient, setRecipient] = useState(initial.recipient);
  const [headline, setHeadline] = useState(initial.headline);
  const [sender, setSender] = useState(initial.sender);
  const [message, setMessage] = useState(initial.message);
  const [photoConsent, setPhotoConsent] = useState(initial.photoConsent);
  const [startDate, setStartDate] = useState(initial.startDate);
  const [days, setDays] = useState(initial.days);
  /** 고치기에서 아직 바꾸지 않은 사진·배너 이미지 */
  const [keptPhoto, setKeptPhoto] = useState(initial.photo);
  const [keptImage, setKeptImage] = useState(initial.image);
  const [showErrors, setShowErrors] = useState(false);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});

  const maxDays = config.data?.eventBannerMaxDays ?? 3;
  const startAt = fromSeoulInput(startDate);
  const endAt = new Date(startAt.getTime() + days * DAY_MS);
  const isTemplate = mode === "TEMPLATE";

  const banner: EventBannerValues = {
    mode,
    occasion,
    recipient,
    headline: isTemplate ? headline.trim() || null : null,
    message: message.trim() || null,
    sender: sender.trim() || null,
    photoAssetId: isTemplate
      ? (photo.state.asset?.assetId ?? keptPhoto?.id ?? null)
      : null,
    photoConsent: isTemplate && photoConsent,
    assetId: isTemplate
      ? null
      : (image.state.asset?.assetId ?? keptImage?.id ?? null),
  };
  const photoUrl = photo.state.previewUrl ?? keptPhoto?.url ?? null;
  const imageUrl = image.state.previewUrl ?? keptImage?.url ?? null;
  const busy = create.isPending || update.isPending;
  const errors: Record<string, string> = {
    ...checkEventBanner(banner, { startAt, endAt }, new Date(), {
      eventBannerMaxDays: maxDays,
    }),
    ...serverErrors,
  };
  const errorOf = (key: string) => (showErrors ? (errors[key] ?? null) : null);
  const uploading = [photo, image].some(
    (upload) =>
      upload.state.status === "uploading" ||
      upload.state.status === "validating",
  );

  const edit = () => {
    setServerErrors({});
    create.markInputChanged();
    update.markInputChanged();
  };

  const onError = (error: ApiError) => {
    if (error.kind === "canceled") return;
    if (error.fields) setServerErrors(error.fields);
    toast.error(
      editing
        ? "이벤트 배너를 수정하지 못했습니다"
        : "이벤트 배너를 보내지 못했습니다",
      { description: toUserMessage(error) },
    );
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setShowErrors(true);
    if (Object.keys(errors).length > 0 || uploading) return;
    const content = { ...banner, recipient: recipient.trim() };
    if (editing) {
      update.mutate(
        {
          submissionId: editing.id,
          version: editing.version,
          eventBanner: content,
          startAt,
          endAt,
        },
        {
          onSuccess: (updated) => {
            toast.success(
              returned ? "재신청 완료" : "수정 내용 저장 완료",
              { description: "승인 후 지정한 날짜에 TV에 게시됩니다." },
            );
            void navigate(to.submissionDetail(updated.id), { replace: true });
          },
          onError,
        },
      );
      return;
    }
    create.mutate(
      {
        type: "EVENT_BANNER",
        eventBanner: content,
        startAt,
        endAt,
        targetGroupIds: [],
      },
      {
        onSuccess: (created) => {
          toast.success("이벤트 배너 접수 완료", {
            description: "승인 후 지정한 날짜에 TV에 게시됩니다.",
          });
          void navigate(to.submissionDetail(created.id), { replace: true });
        },
        onError,
      },
    );
  };

  const period = formatSeoulDayRange(startAt, endAt);

  return (
    <>
      <div>
        <Link
          to={editing ? to.submissionDetail(editing.id) : to.home()}
          className="text-caption text-ink-muted hover:underline"
        >
          {editing ? "콘텐츠 상세" : "올리기"}
        </Link>
        <h1 className="mt-1 text-display text-ink">
          {editing ? "이벤트 배너 고치기" : "이벤트 배너"}
        </h1>
        <p className="mt-1.5 text-label text-ink-muted">
          생일·합격·수상 소식을 TV에 게시합니다. 하루 단위, 최대 {maxDays}일.
        </p>
      </div>

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <form
          noValidate
          onSubmit={submit}
          className="flex flex-col gap-5 rounded-block bg-surface p-6 ring-1 ring-line"
        >
          <div
            role="tablist"
            aria-label="만드는 방식"
            className="grid grid-cols-2 rounded-control bg-surface-muted p-0.75"
          >
            {MODES.map((item) => (
              <button
                key={item.value}
                type="button"
                role="tab"
                aria-selected={mode === item.value}
                onClick={() => {
                  setMode(item.value);
                  edit();
                }}
                className={cn(
                  "h-9 rounded-[6px] text-label transition-colors",
                  mode === item.value
                    ? "bg-surface font-bold text-ink shadow-sm"
                    : "text-ink-muted hover:text-ink",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          <PillField
            label={isTemplate ? "이벤트 종류" : "이벤트 종류 (선택)"}
            required={isTemplate}
            error={errorOf("eventBanner.occasion")}
          >
            <ChoicePills
              label="이벤트 종류"
              options={OCCASION_OPTIONS}
              value={occasion}
              invalid={Boolean(errorOf("eventBanner.occasion"))}
              onChange={(next) => {
                setOccasion(next);
                edit();
              }}
            />
          </PillField>

          <div className="grid gap-3 sm:grid-cols-2">
            <FormField
              label="받는 사람"
              required
              error={errorOf("eventBanner.recipient")}
            >
              {(control) => (
                <Input
                  {...control}
                  value={recipient}
                  maxLength={EVENT_BANNER_TEXT_LIMITS.recipient}
                  placeholder="예: 지민"
                  onChange={(event) => {
                    setRecipient(event.target.value);
                    edit();
                  }}
                />
              )}
            </FormField>
            <FormField
              label="보낸 사람 (선택)"
              error={errorOf("eventBanner.sender")}
            >
              {(control) => (
                <Input
                  {...control}
                  value={sender}
                  maxLength={EVENT_BANNER_TEXT_LIMITS.sender}
                  placeholder="예: 3층 친구들"
                  onChange={(event) => {
                    setSender(event.target.value);
                    edit();
                  }}
                />
              )}
            </FormField>
          </div>

          {isTemplate && (
            <FormField
              label="큰 문구"
              required
              error={errorOf("eventBanner.headline")}
              description={`${headline.trim().length} / ${EVENT_BANNER_TEXT_LIMITS.headline}자 · TV에 크게 표시`}
            >
              {(control) => (
                <Input
                  {...control}
                  value={headline}
                  maxLength={EVENT_BANNER_TEXT_LIMITS.headline}
                  placeholder="예: 지민아, 생일 축하해"
                  onChange={(event) => {
                    setHeadline(event.target.value);
                    edit();
                  }}
                />
              )}
            </FormField>
          )}

          {isTemplate && (
            <FormField
              label="작은 문구"
              required
              error={errorOf("eventBanner.message")}
              description={`${message.trim().length} / ${EVENT_BANNER_TEXT_LIMITS.message}자`}
            >
              {(control) => (
                <Textarea
                  {...control}
                  rows={2}
                  maxLength={EVENT_BANNER_TEXT_LIMITS.message}
                  value={message}
                  placeholder="예: 스물한 살 생일 축하해! 오늘 하루는 네가 주인공"
                  onChange={(event) => {
                    setMessage(event.target.value);
                    edit();
                  }}
                />
              )}
            </FormField>
          )}

          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem]">
            <FormField label="시작일" required error={errorOf("startAt")}>
              {(control) => (
                <Input
                  {...control}
                  type="date"
                  value={startDate}
                  min={toSeoulDateInputValue(new Date())}
                  onChange={(event) => {
                    if (event.target.value) setStartDate(event.target.value);
                    edit();
                  }}
                />
              )}
            </FormField>
            <FormField label="기간" required error={errorOf("endAt")}>
              {(control) => (
                <Select
                  value={String(days)}
                  onValueChange={(value) => {
                    setDays(Number(value));
                    edit();
                  }}
                >
                  <SelectTrigger id={control.id} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: maxDays }, (_, index) => (
                      <SelectItem key={index} value={String(index + 1)}>
                        {index === 0 ? "하루" : `${index + 1}일`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </FormField>
          </div>

          {isTemplate ? (
            <div className="space-y-2">
              <p className="text-sm leading-none font-medium">
                사진 (선택 · 1장)
              </p>
              {keptPhoto && photo.state.status === "idle" && (
                <KeptMedia
                  url={keptPhoto.url}
                  label="지금 사진"
                  onClear={() => {
                    edit();
                    setPhotoConsent(false);
                    setKeptPhoto(null);
                  }}
                />
              )}
              <PosterDropzone
                state={photo.state}
                limits={uploadLimits}
                onSelectFile={(file) => {
                  edit();
                  void photo.selectFile(file);
                }}
                onRetry={photo.retry}
                onClear={() => {
                  edit();
                  setPhotoConsent(false);
                  photo.clear();
                }}
              />
              {(photo.state.status !== "idle" || keptPhoto) && (
                <label className="flex items-start gap-2 text-label text-ink">
                  <input
                    type="checkbox"
                    className="mt-1 accent-ink"
                    checked={photoConsent}
                    onChange={(event) => {
                      setPhotoConsent(event.target.checked);
                      edit();
                    }}
                  />
                  사진 속 인물에게 TV 게시 동의를 받았습니다
                </label>
              )}
              {errorOf("eventBanner.photoConsent") && (
                <p className="text-caption text-danger-strong">
                  {errorOf("eventBanner.photoConsent")}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm leading-none font-medium">
                배너 이미지
                <span className="ml-1 text-danger" aria-hidden="true">
                  *
                </span>
              </p>
              {keptImage && image.state.status === "idle" && (
                <KeptMedia
                  url={keptImage.url}
                  label="지금 배너 이미지"
                  onClear={() => {
                    edit();
                    setKeptImage(null);
                  }}
                />
              )}
              <PosterDropzone
                state={image.state}
                limits={uploadLimits}
                error={errorOf("eventBanner.assetId")}
                onSelectFile={(file) => {
                  edit();
                  void image.selectFile(file);
                }}
                onRetry={image.retry}
                onClear={() => {
                  edit();
                  image.clear();
                }}
              />
            </div>
          )}

          <div className="flex items-center border-t border-surface-muted pt-4">
            <Button
              type="submit"
              className="ml-auto"
              disabled={busy || uploading}
            >
              {busy && <Spinner aria-hidden="true" />}
              {!editing ? "심사 요청" : returned ? "고쳐서 다시 내기" : "저장"}
            </Button>
          </div>
        </form>

        <section aria-labelledby="event-preview" className="min-w-0">
          <h2 id="event-preview" className="mb-2.5 text-subhead text-ink">
            TV 미리보기
          </h2>
          <SceneFrame>
            <EventScene
              qrValue={`${window.location.origin}${to.newEvent()}`}
              content={{
                mode,
                occasion,
                recipient,
                headline,
                message,
                sender,
                photoUrl: isTemplate ? photoUrl : null,
                imageUrl: isTemplate ? null : imageUrl,
              }}
            />
          </SceneFrame>
          <p className="mt-2 text-caption text-ink-muted">
            {period} 동안 모든 TV에 순환 게시
          </p>
        </section>
      </div>
    </>
  );
}

/** 고치기에서 아직 바꾸지 않은 사진. 새로 올리면 그것으로 바뀐다. */
function KeptMedia({
  url,
  label,
  onClear,
}: {
  url: string;
  label: string;
  onClear: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-control bg-surface-muted p-2">
      <img src={url} alt="" className="size-14 rounded-md object-cover" />
      <span className="flex-1 text-caption text-ink-muted">{label}</span>
      <Button type="button" variant="ghost" size="sm" onClick={onClear}>
        지우기
      </Button>
    </div>
  );
}
