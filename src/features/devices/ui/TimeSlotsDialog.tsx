import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { DisplayDevice } from "@/entities/device/model/types";
import { TIME_SLOTS } from "@/entities/widget/model/operation";
import type { TimeSlotRule } from "@/entities/widget/model/operation";
import { seoulDateKey } from "@/entities/widget/model/content";
import { WIDGET_LABELS } from "@/entities/widget/model/settings";
import { WIDGET_TYPES } from "@/entities/widget/model/types";
import type { WidgetType } from "@/entities/widget/model/types";
import { isApiError, toUserMessage } from "@/shared/api/error";
import { ConfirmActionDialog } from "@/shared/components";
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
import {
  SURVEY_WIDGETS,
  TIME_SLOT_LABEL_MAX,
  draftFromRule,
  newTimeSlotDraft,
  timeSlotPhase,
  toTimeSlotRules,
  validateTimeSlotDrafts,
} from "../model/time-slot-form";
import type { TimeSlotDraft, TimeSlotPhase } from "../model/time-slot-form";
import { useSaveTimeSlots, useTvSettings } from "../model/use-widget-settings";

/**
 * 시간대 고정. 정한 날짜·시각에 TV가 순환을 멈추고 한 위젯만 띄운다(예: 저녁 클릭 배틀
 * 이벤트). 끝나면 하던 순환으로 돌아간다. 규칙 전체를 한 번에 저장하고, TV는 1분 안에
 * 읽어 간다. 시각은 서울 기준이고, 겹치면 위에 있는 규칙이 이긴다.
 */
interface TimeSlotsDialogProps {
  devices: readonly DisplayDevice[];
  onClose: () => void;
}

class IncompleteForm extends Error {}

export function TimeSlotsDialog({ devices, onClose }: TimeSlotsDialogProps) {
  const settings = useTvSettings();

  if (!settings.data) {
    return (
      <ConfirmActionDialog
        open
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
        title="시간대 고정"
        description={
          settings.isPending
            ? "설정 불러오는 중"
            : "설정을 불러오지 못했습니다. 잠시 후 다시 접속하세요."
        }
        confirmLabel="닫기"
        onConfirm={() => undefined}
      />
    );
  }
  return (
    <TimeSlotsForm
      devices={devices}
      // 한 번도 저장하지 않았으면 TV가 쓰는 코드 기본 규칙을 보여 준다.
      rules={settings.data.timeSlots ?? TIME_SLOTS}
      usingDefaults={settings.data.timeSlots === null}
      onClose={onClose}
    />
  );
}

let draftSerial = 0;
const newDraftId = () => `slot-${Date.now().toString(36)}-${(draftSerial++).toString(36)}`;

function TimeSlotsForm({
  devices,
  rules,
  usingDefaults,
  onClose,
}: TimeSlotsDialogProps & { rules: readonly TimeSlotRule[]; usingDefaults: boolean }) {
  const [drafts, setDrafts] = useState<TimeSlotDraft[]>(() => rules.map(draftFromRule));
  const [showErrors, setShowErrors] = useState(false);
  const save = useSaveTimeSlots();
  const [now] = useState(() => new Date());

  const errors = showErrors ? validateTimeSlotDrafts(drafts) : {};

  const patch = (id: string, next: Partial<TimeSlotDraft>) =>
    setDrafts((current) =>
      current.map((draft) => (draft.id === id ? { ...draft, ...next } : draft)),
    );

  return (
    <ConfirmActionDialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      className="sm:max-w-2xl"
      title="시간대 고정"
      description={
        <>
          지정한 시간에는 순환을 멈추고 하나의 위젯만 표시합니다. 종료 후 기존 순환으로 돌아갑니다. 한국 시간(KST) 기준이며, 시간이 겹치면 위쪽 규칙이 우선합니다. 저장 후 1분 이내에 TV에 반영됩니다.
          {usingDefaults && " 저장된 설정이 없어 기본 규칙을 표시합니다."}
        </>
      }
      confirmLabel="저장"
      onConfirm={async () => {
        setShowErrors(true);
        if (Object.keys(validateTimeSlotDrafts(drafts)).length > 0) {
          throw new IncompleteForm();
        }
        await save.mutateAsync(toTimeSlotRules(drafts));
        toast.success("시간대 고정 저장 완료");
      }}
      onError={(error) => {
        if (error instanceof IncompleteForm) return;
        toast.error("저장하지 못했습니다", {
          description: isApiError(error)
            ? toUserMessage(error)
            : "잠시 후 다시 시도하세요.",
        });
      }}
    >
      <ul className="-mx-1 flex max-h-[60vh] flex-col gap-3 overflow-y-auto px-1">
        {drafts.length === 0 && (
          <li className="rounded-control border border-dashed border-line px-4 py-6 text-center text-caption text-ink-muted">
            고정된 시간대 없음. TV는 기존 순환에 따라 표시됩니다.
          </li>
        )}
        {drafts.map((draft) => (
          <TimeSlotCard
            key={draft.id}
            draft={draft}
            devices={devices}
            errors={errors[draft.id] ?? []}
            phase={phaseOf(draft, now)}
            onChange={(next) => patch(draft.id, next)}
            onRemove={() =>
              setDrafts((current) => current.filter((item) => item.id !== draft.id))
            }
          />
        ))}
      </ul>
      <Button
        variant="outline"
        size="sm"
        className="justify-self-start"
        onClick={() =>
          setDrafts((current) => [...current, newTimeSlotDraft(seoulDateKey(now), newDraftId())])
        }
      >
        <Plus aria-hidden="true" />
        시간대 추가
      </Button>
    </ConfirmActionDialog>
  );
}

/** 틀린 카드는 상태를 따지지 않는다. */
function phaseOf(draft: TimeSlotDraft, now: Date): TimeSlotPhase | null {
  const [rule] = toTimeSlotRules([draft]);
  return rule ? timeSlotPhase(rule, now) : null;
}

const PHASE_LABEL: Record<TimeSlotPhase, { text: string; tone: string }> = {
  active: { text: "지금 적용 중", tone: "bg-accent text-ink-inverse" },
  upcoming: { text: "예정", tone: "bg-surface-muted text-ink" },
  ended: { text: "끝남", tone: "bg-surface-muted text-ink-subtle" },
};

function TimeSlotCard({
  draft,
  devices,
  errors,
  phase,
  onChange,
  onRemove,
}: {
  draft: TimeSlotDraft;
  devices: readonly DisplayDevice[];
  errors: readonly string[];
  phase: TimeSlotPhase | null;
  onChange: (next: Partial<TimeSlotDraft>) => void;
  onRemove: () => void;
}) {
  const id = `slot-${draft.id}`;
  const allDevices = draft.deviceIds.length === 0;
  const toggleDevice = (deviceId: string, checked: boolean) =>
    onChange({
      deviceIds: checked
        ? [...draft.deviceIds, deviceId]
        : draft.deviceIds.filter((item) => item !== deviceId),
    });

  return (
    <li
      className={cn(
        "flex flex-col gap-3 rounded-control border px-4 py-3",
        phase === "ended" ? "border-line bg-surface-muted" : "border-line-strong",
      )}
    >
      <div className="flex items-center gap-2">
        <Input
          aria-label="시간대 이름"
          className="min-w-0 flex-1"
          value={draft.label}
          maxLength={TIME_SLOT_LABEL_MAX}
          placeholder="예: 클릭 배틀 이벤트 (정보줄에 표시)"
          onChange={(event) => onChange({ label: event.target.value })}
        />
        {phase && (
          <span
            className={cn(
              "shrink-0 rounded-pill px-2 py-0.5 text-caption font-bold",
              PHASE_LABEL[phase].tone,
            )}
          >
            {PHASE_LABEL[phase].text}
          </span>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onRemove}
          aria-label={`${draft.label || "이 시간대"} 지우기`}
        >
          <Trash2 aria-hidden="true" />
        </Button>
      </div>

      <div className="grid gap-x-3 gap-y-2 text-caption text-ink-muted sm:grid-cols-[auto_1fr]">
        <span className="self-center font-bold text-ink">위젯</span>
        <Select
          value={draft.widget}
          onValueChange={(value) => onChange({ widget: value as WidgetType })}
        >
          <SelectTrigger aria-label="띄울 위젯" className="w-full sm:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {WIDGET_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {WIDGET_LABELS[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="self-center font-bold text-ink">날짜</span>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            aria-label="시작 날짜"
            type="date"
            className="w-40"
            value={draft.dateFrom}
            onChange={(event) => onChange({ dateFrom: event.target.value })}
          />
          <span>~</span>
          <Input
            aria-label="끝 날짜"
            type="date"
            className="w-40"
            value={draft.dateTo}
            onChange={(event) => onChange({ dateTo: event.target.value })}
          />
          <span>매일</span>
        </div>

        <span className="self-center font-bold text-ink">시각</span>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            aria-label="시작 시각"
            type="time"
            className="w-32"
            value={draft.timeFrom}
            onChange={(event) => onChange({ timeFrom: event.target.value })}
          />
          <span>~</span>
          <Input
            aria-label="끝 시각"
            type="time"
            className="w-32"
            value={draft.timeTo}
            onChange={(event) => onChange({ timeTo: event.target.value })}
          />
          {draft.timeFrom && draft.timeTo && draft.timeTo < draft.timeFrom && (
            <span>다음 날까지</span>
          )}
        </div>

        <span className="self-start pt-0.5 font-bold text-ink">대상</span>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <label htmlFor={`${id}-all`} className="flex cursor-pointer items-center gap-2">
            <input
              id={`${id}-all`}
              type="checkbox"
              className="accent-ink"
              checked={allDevices}
              onChange={(event) =>
                onChange({
                  deviceIds: event.target.checked ? [] : devices.slice(0, 1).map((d) => d.id),
                })
              }
            />
            모든 TV
          </label>
          {!allDevices &&
            devices.map((device) => (
              <label
                key={device.id}
                htmlFor={`${id}-${device.id}`}
                className="flex cursor-pointer items-center gap-2"
              >
                <input
                  id={`${id}-${device.id}`}
                  type="checkbox"
                  className="accent-ink"
                  checked={draft.deviceIds.includes(device.id)}
                  onChange={(event) => toggleDevice(device.id, event.target.checked)}
                />
                {device.name}
              </label>
            ))}
        </div>

        {SURVEY_WIDGETS.includes(draft.widget) && (
          <>
            <span className="self-start pt-0.5 font-bold text-ink">설문</span>
            <div className="flex flex-col gap-2">
              <label htmlFor={`${id}-survey`} className="flex cursor-pointer items-center gap-2">
                <input
                  id={`${id}-survey`}
                  type="checkbox"
                  className="accent-ink"
                  checked={draft.surveyEnabled}
                  onChange={(event) => onChange({ surveyEnabled: event.target.checked })}
                />
                화면 오른쪽 위에 설문 QR 붙이기
              </label>
              {draft.surveyEnabled && (
                <div className="flex flex-wrap gap-2">
                  <Input
                    aria-label="설문 이름"
                    className="w-32"
                    value={draft.surveyLabel}
                    onChange={(event) => onChange({ surveyLabel: event.target.value })}
                  />
                  <Input
                    aria-label="설문 링크"
                    type="url"
                    className="min-w-0 flex-1"
                    value={draft.surveyUrl}
                    placeholder="https://… (로그인 없이 열리는 공개 링크)"
                    onChange={(event) => onChange({ surveyUrl: event.target.value })}
                  />
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {errors.length > 0 && (
        <p className="text-caption text-danger" role="alert">
          {errors.join(" · ")}
        </p>
      )}
    </li>
  );
}
