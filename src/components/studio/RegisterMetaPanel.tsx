import { FormField } from "@/shared/components";
import { Input } from "@/shared/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { QRCodeBox } from "../common/QRCodeBox";

/**
 * 게시 정보 입력.
 *
 * 카테고리 목록은 장기적으로 Ziggle 분류 체계를 단일 원천으로 삼아야 한다.
 * (명세 6.2) 지금은 프로토타입 목록을 그대로 쓴다.
 *
 * 필드 검증(제목 길이, endAt > startAt, 과거 종료 금지, Ziggle 도메인 허용),
 * 시각 단위 입력, 제출은 Phase 02 범위다.
 */
const categories = ["공지", "동아리", "공연", "행사", "학과"];

interface RegisterMetaPanelProps {
  title: string;
  category: string;
  startDate: string;
  endDate: string;
  detailUrl: string;
  onTitleChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onDetailUrlChange: (value: string) => void;
}

export function RegisterMetaPanel({
  title,
  category,
  startDate,
  endDate,
  detailUrl,
  onTitleChange,
  onCategoryChange,
  onStartDateChange,
  onEndDateChange,
  onDetailUrlChange,
}: RegisterMetaPanelProps) {
  return (
    <aside className="flex h-full w-[288px] shrink-0 flex-col overflow-y-auto border-l border-line bg-surface">
      <div className="border-b border-line px-4 py-3.5">
        <h2 className="text-body font-bold text-ink">게시 정보</h2>
        <p className="mt-0.5 text-caption text-ink-subtle">
          제목, 기간, 링크를 입력하세요
        </p>
      </div>

      <div className="space-y-5 p-4">
        <FormField label="제목" required>
          {(control) => (
            <Input
              {...control}
              value={title}
              onChange={(event) => onTitleChange(event.target.value)}
            />
          )}
        </FormField>

        <FormField label="카테고리" required>
          {(control) => (
            <Select value={category} onValueChange={onCategoryChange}>
              <SelectTrigger
                id={control.id}
                aria-describedby={control["aria-describedby"]}
                className="w-full"
              >
                <SelectValue placeholder="선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </FormField>

        <div className="grid grid-cols-2 gap-2">
          <FormField label="시작일" required>
            {(control) => (
              <Input
                {...control}
                type="date"
                value={startDate}
                onChange={(event) => onStartDateChange(event.target.value)}
              />
            )}
          </FormField>
          <FormField label="종료일" required>
            {(control) => (
              <Input
                {...control}
                type="date"
                value={endDate}
                onChange={(event) => onEndDateChange(event.target.value)}
              />
            )}
          </FormField>
        </div>

        <FormField
          label="상세 링크 (QR)"
          description="공식 Ziggle HTTPS 주소만 허용합니다."
          required
        >
          {(control) => (
            <Input
              {...control}
              value={detailUrl}
              onChange={(event) => onDetailUrlChange(event.target.value)}
              placeholder="https://ziggle.gistory.me/..."
            />
          )}
        </FormField>

        <div className="flex items-center gap-3 rounded-card bg-surface-muted p-3">
          <QRCodeBox value={detailUrl || "https://ziggle.gistory.me"} size="md" />
          <p className="text-caption leading-relaxed text-ink-muted">
            실제 스캔 가능한 QR은 Phase 02에서 붙입니다. 지금은 자리표시자입니다.
          </p>
        </div>
      </div>
    </aside>
  );
}
