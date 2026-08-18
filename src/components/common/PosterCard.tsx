import { fromSubmissionView } from "@/entities/poster";
import type { SubmissionView } from "@/entities/submission/model/types";
import { StatusBadge } from "@/shared/components";
import { formatSeoulPeriod } from "@/shared/lib/datetime";
import { PosterArtwork } from "./PosterArtwork";

interface PosterCardProps {
  submission: SubmissionView;
}

export function PosterCard({ submission }: PosterCardProps) {
  const poster = fromSubmissionView(submission);

  return (
    <article className="group overflow-hidden rounded-card border border-line bg-surface shadow-card transition hover:-translate-y-0.5 hover:shadow-floating">
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-surface-muted">
        <PosterArtwork poster={poster} fit="cover" />
        <div className="absolute left-2.5 top-2.5">
          <StatusBadge status={submission.status} />
        </div>
      </div>
      <div className="space-y-1.5 p-3">
        <h3 className="line-clamp-1 break-keep text-body font-bold text-ink">
          {submission.title}
        </h3>
        <p className="text-caption font-semibold text-ink-subtle">
          {formatSeoulPeriod(submission.startAt, submission.endAt)}
        </p>
        <p className="line-clamp-1 text-caption text-ink-subtle">
          {submission.organizationName}
        </p>
      </div>
    </article>
  );
}
