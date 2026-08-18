import { useId } from "react";
import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";
import { Label } from "@/shared/ui/label";

/** 입력 요소에 그대로 펼쳐 넣는 접근성 속성 묶음 */
export interface FormFieldControlProps {
  id: string;
  required: boolean;
  "aria-describedby": string | undefined;
  "aria-invalid": boolean;
}

interface FormFieldProps {
  label: ReactNode;
  /** 입력 방법이나 제약을 설명한다. 오류와 함께 읽힌다. */
  description?: ReactNode;
  /** 값이 있으면 오류 상태가 되고 입력에 aria-invalid가 붙는다. */
  error?: string | null;
  required?: boolean;
  className?: string;
  children: (control: FormFieldControlProps) => ReactNode;
}

/**
 * label, description, error를 입력 요소에 `aria-describedby`로 연결한다.
 * 화면마다 연결 방식을 새로 만들지 않도록 이 컴포넌트를 쓴다. (명세 9.6)
 */
export function FormField({
  label,
  description,
  error,
  required = false,
  className,
  children,
}: FormFieldProps) {
  const id = useId();
  const descriptionId = description ? `${id}-description` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy =
    [descriptionId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id}>
        {label}
        {required && (
          <span className="text-danger" aria-hidden="true">
            *
          </span>
        )}
        {required && <span className="sr-only">필수 항목</span>}
      </Label>

      {children({
        id,
        required,
        "aria-describedby": describedBy,
        "aria-invalid": Boolean(error),
      })}

      {description && (
        <p id={descriptionId} className="text-caption text-muted-foreground">
          {description}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-caption text-danger-strong">
          {error}
        </p>
      )}
    </div>
  );
}
