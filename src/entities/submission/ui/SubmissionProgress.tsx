import { Fragment } from "react";
import { getProgressSteps } from "@/entities/submission";
import type {
  ProgressStepState,
  SubmissionStatus,
} from "@/entities/submission";
import { cn } from "@/shared/lib/utils";

/**
 * 신청이 지금 어디쯤인지 다섯 단계로 한 줄에. 점과 이름만 둔다.
 *
 * 누를 수 있는 것처럼 보이면 안 된다. 테두리 상자나 배경을 두지 않고, 지금 단계만
 * 진하게, 멈춘 단계(반려·중단)만 강조색으로 둔다. 색을 못 봐도 이름이 바뀌어 있어
 * 무슨 일인지 읽힌다.
 */
const labelClass: Record<ProgressStepState, string> = {
  done: "text-ink-muted",
  current: "font-bold text-ink",
  problem: "font-bold text-accent-600",
  todo: "text-ink-subtle",
};

const dotClass: Record<ProgressStepState, string> = {
  done: "border-ink-subtle bg-ink-subtle",
  current: "border-ink bg-ink ring-3 ring-surface-muted",
  problem: "border-accent bg-accent ring-3 ring-accent-200",
  todo: "border-line-strong bg-surface",
};

export function SubmissionProgress({
  status,
  className,
}: {
  status: SubmissionStatus;
  className?: string;
}) {
  const steps = getProgressSteps(status);

  return (
    <ol
      aria-label="진행 단계"
      className={cn("flex flex-wrap items-center gap-x-2 gap-y-1", className)}
    >
      {steps.map((step, index) => (
        <Fragment key={step.label}>
          {index > 0 && (
            <li aria-hidden="true" className="h-px w-4 bg-line-strong" />
          )}
          <li
            aria-current={
              step.state === "current" || step.state === "problem"
                ? "step"
                : undefined
            }
            className={cn(
              "inline-flex items-center gap-1.5 text-caption whitespace-nowrap",
              labelClass[step.state],
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "size-2 rounded-pill border-[1.5px]",
                dotClass[step.state],
              )}
            />
            {step.label}
          </li>
        </Fragment>
      ))}
    </ol>
  );
}
