import { cn } from "@/shared/lib/utils";
import { KIND_INFO } from "../model/kind";
import type { SubmissionKind } from "../model/kind";
import { KIND_STYLE } from "./kind-style";

/** 종류 칩. "포스터" "이벤트" "제보" */
export function TypeBadge({
  kind,
  className,
}: {
  kind: SubmissionKind;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center rounded-pill px-2.5 text-overline",
        KIND_STYLE[kind].soft,
        className,
      )}
    >
      {KIND_INFO[kind].short}
    </span>
  );
}
