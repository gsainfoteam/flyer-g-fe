import { QRCodeBox } from "@/shared/components/QRCodeBox";
import type { Category, SignageConfig } from "@/entities/submission";
import { FormField } from "@/shared/components";
import { Input } from "@/shared/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Textarea } from "@/shared/ui/textarea";
import type { SubmissionDraft } from "../model/draft";
import { TEXT_LIMITS } from "../model/validate";
import type { SubmissionFieldErrors } from "../model/validate";

/**
 * 게시 정보 입력 (명세 FR-SUB-02).
 *
 * Ziggle 공지를 조회할 API가 없어(`API-CHANGES-BACKEND.md` 3절) TV에 나가는 부제·
 * 주최·장소와 상세 링크를 신청자가 직접 입력한다. 상세 링크는 허용된 Ziggle 주소만
 * 받는다 — 승인된 포스터가 임의의 주소로 사람을 보내지 않게(명세 9.4). 링크가 없으면
 * QR 없이 게시한다. 서버는 링크가 Ziggle 공지 주소면 공지 하나에 신청 하나로 막는다.
 */

/**
 * 입력 칸이 받는 최대 글자 수는 상한보다 넉넉하게 둔다. 상한에서 잘라 버리면 붙여
 * 넣은 긴 글이 말없이 잘리고, 몇 자를 줄여야 하는지 알 수 없다.
 */
const inputLimit = (max: number) => max * 2;

interface SubmissionFormProps {
  draft: SubmissionDraft;
  errors: SubmissionFieldErrors;
  /** 제출을 한 번이라도 눌렀는지. 누르기 전에는 오류를 미리 띄우지 않는다. */
  showErrors: boolean;
  /** 고를 수 있는 카테고리. 받는 중이면 빈 배열 */
  categories: readonly Category[];
  /** 서버 운영 제한값. 받는 중이면 null이고 안내 문구를 줄인다. */
  config: SignageConfig | null;
  disabled?: boolean;
  onChange: (patch: Partial<SubmissionDraft>) => void;
}

export function SubmissionForm({
  draft,
  errors,
  showErrors,
  categories,
  config,
  disabled = false,
  onChange,
}: SubmissionFormProps) {
  const errorOf = (field: keyof SubmissionFieldErrors) =>
    showErrors ? (errors[field] ?? null) : null;

  const titleLength = draft.title.trim().length;
  const titleMax = config?.titleMaxLength;
  const detailUrl = draft.detailUrl.trim();

  const periodHint = config
    ? `시작은 신청 시각에서 ${config.minLeadTimeHours}시간 이후부터, 기간은 최대 ${config.maxPublishMonths}개월이에요.`
    : undefined;

  return (
    <div className="space-y-5">
      <FormField
        label="제목"
        required
        error={errorOf("title")}
        description={titleMax ? `${titleLength} / ${titleMax}자` : undefined}
      >
        {(control) => (
          <Input
            {...control}
            value={draft.title}
            disabled={disabled}
            maxLength={titleMax ? inputLimit(titleMax) : undefined}
            onChange={(event) => onChange({ title: event.target.value })}
          />
        )}
      </FormField>

      <FormField label="카테고리" required error={errorOf("categoryId")}>
        {(control) => (
          <Select
            value={draft.categoryId}
            disabled={disabled || categories.length === 0}
            // 사용자는 카테고리를 비울 수 없다. 빈 값은 Radix Select가 마운트 직후
            // 항목이 등록되기 전에 value가 바뀌면 보내는 것이라, 받으면 방금 채운
            // 카테고리가 지워진다(캐시된 신청으로 수정 화면을 열 때).
            onValueChange={(categoryId) => {
              if (categoryId) onChange({ categoryId });
            }}
          >
            <SelectTrigger
              id={control.id}
              aria-describedby={control["aria-describedby"]}
              aria-invalid={control["aria-invalid"]}
              className="w-full"
            >
              <SelectValue
                placeholder={
                  categories.length === 0 ? "불러오는 중" : "선택하세요"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </FormField>

      <FormField
        label="부제"
        error={errorOf("subtitle")}
        description="TV에서 제목 아래에 나와요. 일시 안내를 적으면 좋아요."
      >
        {(control) => (
          <Input
            {...control}
            value={draft.subtitle}
            disabled={disabled}
            maxLength={inputLimit(TEXT_LIMITS.subtitle)}
            placeholder="예: 12월 셋째 주 금요일 저녁 7시"
            onChange={(event) => onChange({ subtitle: event.target.value })}
          />
        )}
      </FormField>

      <FormField label="주최" error={errorOf("organizerName")}>
        {(control) => (
          <Input
            {...control}
            value={draft.organizerName}
            disabled={disabled}
            maxLength={inputLimit(TEXT_LIMITS.organizerName)}
            placeholder="예: 공연동아리 페이드인"
            onChange={(event) =>
              onChange({ organizerName: event.target.value })
            }
          />
        )}
      </FormField>

      <FormField label="장소" error={errorOf("location")}>
        {(control) => (
          <Input
            {...control}
            value={draft.location}
            disabled={disabled}
            maxLength={inputLimit(TEXT_LIMITS.location)}
            placeholder="예: 대강당"
            onChange={(event) => onChange({ location: event.target.value })}
          />
        )}
      </FormField>

      <FormField
        label="게시 시작"
        required
        error={errorOf("startAt")}
        description="한국 시간(KST) 기준이에요."
      >
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
        description={["종료 시각이 지나면 자동으로 내려갑니다.", periodHint]
          .filter(Boolean)
          .join(" ")}
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
        description="Ziggle 공지 주소를 넣으면 TV에 QR로 나가요. 비우면 QR 없이 게시돼요."
      >
        {(control) => (
          <Input
            {...control}
            type="url"
            inputMode="url"
            value={draft.detailUrl}
            disabled={disabled}
            placeholder="https://ziggle.gistory.me/notice/..."
            onChange={(event) => onChange({ detailUrl: event.target.value })}
          />
        )}
      </FormField>

      <div className="flex items-center gap-3 rounded-card border border-line bg-surface-muted p-3">
        <QRCodeBox
          value={detailUrl}
          size="md"
          emptyLabel="링크를 넣으면 생겨요"
        />
        <p className="text-caption leading-relaxed text-ink-muted">
          {detailUrl
            ? "TV에 이 QR이 그대로 나갑니다. 휴대폰으로 스캔해 맞는 주소인지 확인해 보세요."
            : "상세 링크가 없으면 TV에 QR 칸이 없어요."}
        </p>
      </div>

      <FormField
        label="설명"
        error={errorOf("description")}
        description="TV에는 나오지 않아요. 검토자와 신청 상세에서 보여요."
      >
        {(control) => (
          <Textarea
            {...control}
            value={draft.description}
            disabled={disabled}
            maxLength={inputLimit(TEXT_LIMITS.description)}
            rows={3}
            onChange={(event) => onChange({ description: event.target.value })}
          />
        )}
      </FormField>
    </div>
  );
}
