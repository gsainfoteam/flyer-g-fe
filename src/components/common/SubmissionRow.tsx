import type { ReactNode } from "react";
import { fromSubmissionView } from "@/entities/poster";
import type { SubmissionView } from "@/entities/submission/model/types";
import { cn } from "@/shared/lib/utils";
import { PosterThumb } from "./PosterThumb";

/**
 * 목록의 신청 한 건.
 *
 * 관리자는 많은 건을 빠르게 훑어야 하므로 제목이 가장 먼저 읽히고, 그 아래
 * **지금 어떤 상황인지 한 문장**이 붙는다. 배지 색을 구분하지 못해도 상황을 알 수
 * 있어야 한다. 썸네일은 어느 포스터인지 알아보는 보조 역할이다.
 */
interface SubmissionRowProps {
  submission: SubmissionView;
  /** 상태를 설명하는 한 문장. `getStatusSentence()` 결과를 넣는다. */
  sentence: ReactNode;
  /** 제목 옆의 작은 표식. 예: 재신청 2회차 */
  titleTag?: ReactNode;
  /** 오른쪽에 놓을 배지, 기간, 작업 버튼 */
  trailing?: ReactNode;
  /** 지금 처리해야 하는 건임을 알린다. */
  highlighted?: boolean;
  thumbSize?: "sm" | "md";
  className?: string;
}

export function SubmissionRow({
  submission,
  sentence,
  titleTag,
  trailing,
  highlighted = false,
  thumbSize = "sm",
  className,
}: SubmissionRowProps) {
  return (
    <li
      className={cn(
        "flex items-center gap-4 rounded-control px-3.5 py-3.5",
        highlighted && "bg-attention-subtle",
        className,
      )}
    >
      <PosterThumb poster={fromSubmissionView(submission)} size={thumbSize} />

      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-subhead text-ink">
          <span className="truncate">{submission.title}</span>
          {titleTag}
        </p>
        <p className="mt-0.5 truncate text-label text-ink-muted">{sentence}</p>
      </div>

      {trailing}
    </li>
  );
}
