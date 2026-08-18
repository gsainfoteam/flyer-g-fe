import { CalendarDays, ChevronRight, MapPin, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { PosterRenderModel } from "@/entities/poster";
import { formatSeoulDateTime } from "@/shared/lib/datetime";
import { Logo } from "../common/Logo";
import { PosterArtwork } from "../common/PosterArtwork";
import { QRCodeBox } from "../common/QRCodeBox";
import { LiveClock } from "./LiveClock";

interface SinglePosterDisplayProps {
  poster: PosterRenderModel;
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="inline-flex items-center gap-1.5 rounded-control bg-brand-subtle px-2.5 py-1.5 text-body font-black text-brand-strong">
        <Icon className="size-4" aria-hidden="true" />
        {label}
      </span>
      <span className="text-title font-bold text-ink-muted">{value}</span>
    </div>
  );
}

export function SinglePosterDisplay({ poster }: SinglePosterDisplayProps) {
  return (
    <div className="relative h-full">
      <div className="absolute right-1 top-1">
        <LiveClock />
      </div>

      <div className="flex h-full items-stretch gap-8 pr-44">
        <section className="flex w-[36%] shrink-0 flex-col py-2">
          <Logo size="lg" />

          <div className="mt-10">
            <span className="inline-flex rounded-control bg-brand px-4 py-1.5 text-heading font-black text-brand-on">
              {poster.categoryName}
            </span>
            <h1 className="mt-6 break-keep text-display tracking-tight text-ink">
              {poster.title}
            </h1>
            {poster.subtitle && (
              <div className="mt-5 inline-block">
                <p className="text-title font-bold text-ink-muted">
                  {poster.subtitle}
                </p>
                <span className="mt-2 block h-1 w-28 rounded-pill bg-accent-brand" />
              </div>
            )}
          </div>

          <div className="mt-10 space-y-4">
            <InfoRow
              icon={CalendarDays}
              label="일시"
              value={formatSeoulDateTime(poster.startAt)}
            />
            {poster.location && (
              <InfoRow icon={MapPin} label="장소" value={poster.location} />
            )}
            {poster.organizationName && (
              <InfoRow icon={Users} label="주최" value={poster.organizationName} />
            )}
          </div>

          <div className="mt-auto flex items-center gap-5">
            <QRCodeBox value={poster.detailUrl} size="xl" />
            <div>
              <p className="text-heading font-bold text-ink-muted">
                더 많은 공지와 정보를
                <br />
                확인해보세요!
              </p>
              <a
                href={poster.detailUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-title font-black text-brand-strong"
              >
                Ziggle에서 자세히 보기
                <ChevronRight className="size-5" aria-hidden="true" />
              </a>
            </div>
          </div>
        </section>

        <section className="flex flex-1 items-center justify-center">
          <div className="aspect-[3/4] h-full max-h-full overflow-hidden rounded-dialog bg-surface shadow-dialog ring-1 ring-line">
            <PosterArtwork poster={poster} fit="cover" />
          </div>
        </section>
      </div>
    </div>
  );
}
