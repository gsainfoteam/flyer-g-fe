import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

/**
 * 몇 개 안 되는 값 중 하나를 고르는 알약 줄(라디오 그룹). 말머리·이벤트 종류처럼
 * 한눈에 모두 보여야 하는 선택에 쓴다. 화살표 키로 옮기는 대신 각 알약이 탭으로
 * 잡힌다(값이 다섯 개 안팎).
 */
export function ChoicePills<T extends string>({
  label,
  options,
  value,
  onChange,
  invalid = false,
}: {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T | null;
  onChange: (value: T) => void;
  invalid?: boolean;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      aria-invalid={invalid || undefined}
      className="flex flex-wrap gap-1.5"
    >
      {options.map((option) => {
        const checked = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={checked}
            onClick={() => onChange(option.value)}
            className={cn(
              "h-9 rounded-pill border px-3.5 text-label transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
              checked
                ? "border-ink bg-ink font-semibold text-surface"
                : "border-line-strong bg-surface text-ink hover:bg-surface-muted",
              invalid && !checked && "border-danger",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** 알약 줄의 제목과 오류. 입력 칸이 아니라 `FormField`의 label 연결을 쓰지 않는다. */
export function PillField({
  label,
  required = true,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string | null;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <p className="flex items-center gap-2 text-sm leading-none font-medium">
        {label}
        {required && (
          <span className="text-danger" aria-hidden="true">
            *
          </span>
        )}
      </p>
      {children}
      {error && <p className="text-caption text-danger-strong">{error}</p>}
    </div>
  );
}
