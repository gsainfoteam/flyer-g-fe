import { fromSubmissionView } from "@/entities/poster";
import type { SubmissionView } from "@/entities/submission/model/types";
import { StatusBadge } from "@/shared/components";
import { formatSeoulPeriod } from "@/shared/lib/datetime";
import { PosterArtwork } from "./PosterArtwork";

/**
 * 목록의 신청 한 건.
 *
 * 관리자는 많은 건을 빠르게 훑어야 하므로 썸네일보다 제목·기간·상태를 먼저 읽히게 한다.
 * 카드 격자 대신 행으로 두어 한 화면에 담기는 건수를 늘린다.
 */
interface SubmissionRowProps {
  submission: SubmissionView;
}

export function SubmissionRow({ submission }: SubmissionRowProps) {
  return (
    <li className="flex items-center gap-3 py-3">
      <div className="aspect-[3/4] w-9 shrink-0 overflow-hidden rounded-sm bg-surface-muted">
        <PosterArtwork poster={fromSubmissionView(submission)} fit="cover" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-label text-ink">{submission.title}</p>
        <p className="mt-0.5 truncate text-caption text-ink-muted">
          {formatSeoulPeriod(submission.startAt, submission.endAt)} ·{" "}
          {submission.organizationName}
        </p>
      </div>

      <StatusBadge status={submission.status} hideIcon className="shrink-0" />
    </li>
  );
}
