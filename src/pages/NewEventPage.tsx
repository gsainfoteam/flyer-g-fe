import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router";
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
import { useCreateContent } from "@/features/submissions/create/model/use-create-content";
import { ChoicePills, FormField, PillField } from "@/shared/components";
import { toUserMessage } from "@/shared/api/error";
import { to } from "@/shared/config/routes";
import {
  formatSeoulDayRange,
  fromSeoulInput,
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

export function NewEventPage() {
  const navigate = useNavigate();
  const config = useSignageConfig();
  const create = useCreateContent();
  const uploadLimits = useMemo(
    () => (config.data ? { maxSizeBytes: config.data.maxUploadBytes } : null),
    [config.data],
  );
  // 배너에는 영상을 쓰지 않는다. 사진과 배너 이미지는 업로드 칸을 따로 둔다.
  const photo = usePosterUpload({ limits: uploadLimits });
  const image = usePosterUpload({ limits: uploadLimits });

  const [mode, setMode] = useState<EventBannerMode>("TEMPLATE");
  const [occasion, setOccasion] = useState<EventBannerOccasion | null>(null);
  const [recipient, setRecipient] = useState("");
  const [sender, setSender] = useState("");
  const [message, setMessage] = useState("");
  const [photoConsent, setPhotoConsent] = useState(false);
  const [startDate, setStartDate] = useState(() =>
    toSeoulDateInputValue(new Date()),
  );
  const [days, setDays] = useState(1);
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
    message: message.trim() || null,
    sender: sender.trim() || null,
    photoAssetId: isTemplate ? (photo.state.asset?.assetId ?? null) : null,
    photoConsent: isTemplate && photoConsent,
    assetId: isTemplate ? null : (image.state.asset?.assetId ?? null),
  };
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
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setShowErrors(true);
    if (Object.keys(errors).length > 0 || uploading) return;
    create.mutate(
      {
        type: "EVENT_BANNER",
        eventBanner: { ...banner, recipient: recipient.trim() },
        startAt,
        endAt,
        targetGroupIds: [],
      },
      {
        onSuccess: (created) => {
          toast.success("이벤트 배너를 보냈어요", {
            description: "승인되면 정한 날짜에 TV에 나가요.",
          });
          void navigate(to.submissionDetail(created.id), { replace: true });
        },
        onError: (error) => {
          if (error.kind === "canceled") return;
          if (error.fields) setServerErrors(error.fields);
          toast.error("이벤트 배너를 보내지 못했어요", {
            description: toUserMessage(error),
          });
        },
      },
    );
  };

  const period = formatSeoulDayRange(startAt, endAt);

  return (
    <>
      <div>
        <Link
          to={to.home()}
          className="text-caption text-ink-muted hover:underline"
        >
          올리기
        </Link>
        <h1 className="mt-1 text-display text-ink">이벤트 배너</h1>
        <p className="mt-1.5 text-label text-ink-muted">
          생일·합격·수상 같은 소식을 TV에 띄워요. 하루 단위, 최대 {maxDays}일.
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
              label="문구"
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
              {photo.state.status !== "idle" && (
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
                  사진 속 사람에게 TV에 띄워도 된다는 동의를 받았어요
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
              disabled={create.isPending || uploading}
            >
              {create.isPending && <Spinner aria-hidden="true" />}
              심사 요청
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
                message,
                sender,
                photoUrl: isTemplate ? photo.state.previewUrl : null,
                imageUrl: isTemplate ? null : image.state.previewUrl,
              }}
            />
          </SceneFrame>
          <p className="mt-2 text-caption text-ink-muted">
            {period} 동안 모든 TV에서 한 바퀴마다 나와요
          </p>
        </section>
      </div>
    </>
  );
}
