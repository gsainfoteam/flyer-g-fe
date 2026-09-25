import { QRCodeBox } from "@/components/common/QRCodeBox";
import { SUBMISSION_CATEGORIES } from "@/entities/submission";
import { FormField } from "@/shared/components";
import { Input } from "@/shared/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import type { SubmissionDraft } from "../model/draft";
import { TITLE_MAX_LENGTH } from "../model/validate";
import type { SubmissionFieldErrors } from "../model/validate";

/**
 * 게시 정보 입력 (명세 FR-SUB-02).
 *
 * 상세 링크는 사용자가 고치지 못한다. QR이 가리키는 곳은 연결된 Ziggle 공지여야
 * 하며, 자유 입력을 허용하면 승인된 포스터가 임의의 주소로 사람을 보낼 수 있다.
 * (명세 9.4 피싱 링크 방지)
 *
 * 대상 위치와 게시자 메모는 아직 서버 계약이 없어 입력받지 않는다. 계약이
 * 정해지면 이 폼에 추가한다. (`API-REQUIREMENTS.md` 3절 12번)
 */
interface SubmissionFormProps {
  draft: SubmissionDraft;
  errors: SubmissionFieldErrors;
  /** 제출을 한 번이라도 눌렀는지. 누르기 전에는 오류를 미리 띄우지 않는다. */
  showErrors: boolean;
  disabled?: boolean;
  onChange: (patch: Partial<SubmissionDraft>) => void;
}

export function SubmissionForm({
  draft,
  errors,
  showErrors,
  disabled = false,
  onChange,
}: SubmissionFormProps) {
  const errorOf = (field: keyof SubmissionFieldErrors) =>
    showErrors ? (errors[field] ?? null) : null;

  const titleLength = draft.title.trim().length;

  return (
    <div className="space-y-5">
      <FormField
        label="제목"
        required
        error={errorOf("title")}
        description={`${titleLength} / ${TITLE_MAX_LENGTH}자`}
      >
        {(control) => (
          <Input
            {...control}
            value={draft.title}
            disabled={disabled}
            maxLength={TITLE_MAX_LENGTH * 2}
            onChange={(event) => onChange({ title: event.target.value })}
          />
        )}
      </FormField>

      <FormField label="카테고리" required error={errorOf("categoryId")}>
        {(control) => (
          <Select
            value={draft.categoryId}
            disabled={disabled}
            onValueChange={(categoryId) => onChange({ categoryId })}
          >
            <SelectTrigger
              id={control.id}
              aria-describedby={control["aria-describedby"]}
              aria-invalid={control["aria-invalid"]}
              className="w-full"
            >
              <SelectValue placeholder="선택하세요" />
            </SelectTrigger>
            <SelectContent>
              {SUBMISSION_CATEGORIES.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </FormField>

      <FormField label="게시 시작" required error={errorOf("startAt")}>
        {(control) => (
          <Input
            {...control}
            type="datetime-local"
            value={draft.startAt}
            disabled={disabled}
            onChange={(event) => onChange({ startAt: event.target.value })}
          />
        )}
      </FormField>

      <FormField
        label="게시 종료"
        required
        error={errorOf("endAt")}
        description="종료 시각이 지나면 자동으로 내려갑니다."
      >
        {(control) => (
          <Input
            {...control}
            type="datetime-local"
            value={draft.endAt}
            disabled={disabled}
            onChange={(event) => onChange({ endAt: event.target.value })}
          />
        )}
      </FormField>

      <FormField
        label="상세 링크 (QR)"
        error={errorOf("detailUrl")}
        description="연결된 Ziggle 공지의 주소입니다. 직접 바꿀 수 없어요."
      >
        {(control) => (
          <Input
            {...control}
            value={draft.detailUrl}
            readOnly
            placeholder="공지를 연결하면 채워집니다"
          />
        )}
      </FormField>

      <div className="flex items-center gap-3 rounded-card border border-line bg-surface-muted p-3">
        <QRCodeBox value={draft.detailUrl.trim()} size="md" />
        <p className="text-caption leading-relaxed text-ink-muted">
          TV에 이 QR이 그대로 나갑니다. 스캔하면 Ziggle 공지 원문으로 갑니다.
        </p>
      </div>
    </div>
  );
}
