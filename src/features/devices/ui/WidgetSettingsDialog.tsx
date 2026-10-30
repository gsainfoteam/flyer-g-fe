import { useState } from "react";
import { toast } from "sonner";
import type { DisplayDevice } from "@/entities/device/model/types";
import {
  WIDGET_DESCRIPTIONS,
  WIDGET_LABELS,
  WIDGET_RATIO_PERCENT,
} from "@/entities/widget/model/settings";
import type { DeviceWidgetSettings } from "@/entities/widget/model/settings";
import { WIDGET_DURATION_SECONDS } from "@/entities/widget/model/types";
import { isApiError, toUserMessage } from "@/shared/api/error";
import { ConfirmActionDialog } from "@/shared/components";
import { cn } from "@/shared/lib/utils";
import { Input } from "@/shared/ui/input";
import {
  useSaveWidgetSettings,
  useWidgetSettings,
} from "../model/use-widget-settings";
import {
  DATED_WIDGETS,
  draftFromSetting,
  toWidgetSettingDtos,
  validateRatioPercent,
  validateWidgetDrafts,
} from "../model/widget-settings-form";
import type {
  WidgetDraftErrors,
  WidgetSettingDraft,
} from "../model/widget-settings-form";

/**
 * 기기 위젯 설정. 포스터 사이에 끼울 위젯을 종류마다 켜고 끄고 머무는 시간을 정하고,
 * 기기 단위로 위젯 비율(화면 시간 중 위젯 몫의 상한)을 정한다. 언제 끼울지(시간대·간격)는
 * 노출 정책이 정한다. 다음 갱신 때 TV에 반영된다.
 *
 * 설정은 위젯 API로 따로 주고받는다. 서버가 아직 지원하지 않으면 그렇다고 알린다.
 */
interface WidgetSettingsDialogProps {
  device: DisplayDevice;
  onClose: () => void;
}

class IncompleteForm extends Error {}

export function WidgetSettingsDialog({ device, onClose }: WidgetSettingsDialogProps) {
  const settings = useWidgetSettings(device.id);

  if (!settings.data) {
    const unsupported =
      isApiError(settings.error) && settings.error.code === "WIDGETS_UNSUPPORTED";
    return (
      <ConfirmActionDialog
        open
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
        title={`${device.name} 위젯`}
        description={
          settings.isPending
            ? "위젯 설정을 불러오는 중이에요."
            : unsupported
              ? "서버가 아직 위젯 설정을 지원하지 않아요. 백엔드 작업(flyer-g-be#24) 뒤에 열려요."
              : "위젯 설정을 불러오지 못했어요. 잠시 후 다시 열어 주세요."
        }
        confirmLabel="닫기"
        onConfirm={() => undefined}
      />
    );
  }
  return <WidgetSettingsForm device={device} settings={settings.data} onClose={onClose} />;
}

function WidgetSettingsForm({
  device,
  settings,
  onClose,
}: WidgetSettingsDialogProps & { settings: DeviceWidgetSettings }) {
  const [drafts, setDrafts] = useState<WidgetSettingDraft[]>(() =>
    settings.widgets.map(draftFromSetting),
  );
  const [ratio, setRatio] = useState(String(settings.ratioPercent));
  const [showErrors, setShowErrors] = useState(false);
  const save = useSaveWidgetSettings(device.id);

  const errors: WidgetDraftErrors = showErrors ? validateWidgetDrafts(drafts) : {};
  const ratioError = showErrors ? validateRatioPercent(ratio) : null;

  const patch = (index: number, next: Partial<WidgetSettingDraft>) =>
    setDrafts((current) =>
      current.map((draft, at) => (at === index ? { ...draft, ...next } : draft)),
    );

  return (
    <ConfirmActionDialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={`${device.name} 위젯`}
      description="포스터 사이에 한 번에 하나씩 끼울 위젯이에요. 다음 갱신 때 TV에 반영돼요."
      confirmLabel="저장"
      onConfirm={async () => {
        setShowErrors(true);
        if (
          Object.keys(validateWidgetDrafts(drafts)).length > 0 ||
          validateRatioPercent(ratio)
        ) {
          throw new IncompleteForm();
        }
        await save.mutateAsync({
          ratioPercent: Number(ratio),
          widgets: toWidgetSettingDtos(drafts, settings.widgets),
        });
        toast.success("위젯 설정을 저장했어요");
      }}
      onError={(error) => {
        if (error instanceof IncompleteForm) return;
        toast.error("저장하지 못했어요", {
          description: isApiError(error)
            ? toUserMessage(error)
            : "잠시 후 다시 시도해 주세요.",
        });
      }}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2 text-caption text-ink-muted">
        <span>화면 시간 중 위젯은 최대</span>
        <Input
          aria-label="위젯 비율(%)"
          type="number"
          inputMode="numeric"
          className="w-20"
          min={WIDGET_RATIO_PERCENT.min}
          max={WIDGET_RATIO_PERCENT.max}
          value={ratio}
          onChange={(event) => setRatio(event.target.value)}
        />
        <span>%까지 (나머지는 포스터)</span>
        {ratioError && (
          <p className="w-full text-caption text-danger" role="alert">
            위젯 비율: {ratioError}
          </p>
        )}
      </div>
      <ul className="-mx-1 flex max-h-[55vh] flex-col gap-2 overflow-y-auto px-1">
        {drafts.map((draft, index) => (
          <WidgetRow
            key={draft.type}
            draft={draft}
            errors={errors[draft.type] ?? {}}
            onChange={(next) => patch(index, next)}
          />
        ))}
      </ul>
    </ConfirmActionDialog>
  );
}

function WidgetRow({
  draft,
  errors,
  onChange,
}: {
  draft: WidgetSettingDraft;
  errors: NonNullable<WidgetDraftErrors[keyof WidgetDraftErrors]>;
  onChange: (next: Partial<WidgetSettingDraft>) => void;
}) {
  const id = `widget-${draft.type.toLowerCase()}`;
  const dated = DATED_WIDGETS.includes(draft.type);
  const messages = [
    errors.label,
    errors.dates,
    errors.durationSeconds && `머무는 시간: ${errors.durationSeconds}`,
  ].filter(Boolean);

  return (
    <li
      className={cn(
        "rounded-control border px-4 py-3",
        draft.enabled ? "border-line-strong" : "border-line bg-surface-muted",
      )}
    >
      <label htmlFor={id} className="flex cursor-pointer items-start gap-3">
        <input
          id={id}
          type="checkbox"
          className="mt-1 accent-ink"
          checked={draft.enabled}
          onChange={(event) => onChange({ enabled: event.target.checked })}
        />
        <span className="min-w-0">
          <span className="block text-label font-bold text-ink">
            {WIDGET_LABELS[draft.type]}
          </span>
          <span className="block text-caption text-ink-muted">
            {WIDGET_DESCRIPTIONS[draft.type]}
          </span>
        </span>
      </label>

      {draft.enabled && (
        <div className="mt-3 flex flex-col gap-2 pl-7">
          {dated && (
            <div className="flex flex-wrap items-center gap-2">
              <Input
                aria-label={`${WIDGET_LABELS[draft.type]} 이름`}
                className="w-32"
                value={draft.label}
                placeholder={draft.type === "DDAY" ? "예: 종강" : "예: 기말고사"}
                onChange={(event) => onChange({ label: event.target.value })}
              />
              <Input
                aria-label={draft.type === "DDAY" ? "D-day 날짜" : "시험 시작일"}
                type="date"
                className="w-40"
                value={draft.startDate}
                onChange={(event) => onChange({ startDate: event.target.value })}
              />
              {draft.type === "EXAM_CHEER" && (
                <>
                  <span className="text-caption text-ink-subtle">~</span>
                  <Input
                    aria-label="시험 마지막 날"
                    type="date"
                    className="w-40"
                    value={draft.endDate}
                    onChange={(event) => onChange({ endDate: event.target.value })}
                  />
                </>
              )}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-ink-muted">
            <Input
              aria-label={`${WIDGET_LABELS[draft.type]} 머무는 시간(초)`}
              type="number"
              inputMode="numeric"
              className="w-20"
              min={WIDGET_DURATION_SECONDS.min}
              max={WIDGET_DURATION_SECONDS.max}
              value={draft.durationSeconds}
              onChange={(event) => onChange({ durationSeconds: event.target.value })}
            />
            <span>초 동안 보여 줘요</span>
          </div>
          {messages.length > 0 && (
            <p className="text-caption text-danger" role="alert">
              {messages.join(" · ")}
            </p>
          )}
        </div>
      )}
    </li>
  );
}
