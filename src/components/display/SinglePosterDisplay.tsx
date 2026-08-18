import { CalendarDays, ChevronRight, MapPin, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { PosterRenderModel } from "@/entities/poster";
import { formatSeoulDateTime } from "@/shared/lib/datetime";
import { Logo } from "../common/Logo";
import { PosterArtwork } from "../common/PosterArtwork";
import { QRCodeBox } from "../common/QRCodeBox";
import { LiveClock } from "./LiveClock";

/**
 * TV는 원거리에서 읽는 화면이라 관리자 웹의 타이포 scale을 그대로 쓰지 않는다.
 * 아래 크기는 화면 전용이며 1920x1080 실측 검증은 Phase 05에서 한다. (명세 9.6)
 */
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
      <span className="inline-flex w-[4.5rem] shrink-0 items-center gap-1.5 text-[1rem] text-ink-muted">
        <Icon className="size-4" aria-hidden="true" />
        {label}
      </span>
      <span className="text-[1.5rem] font-medium text-ink">{value}</span>
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
        <section className="flex w-[36%] shrink-0 flex-col py-1">
          <Logo size="lg" />

          <div className="mt-8">
            <span className="inline-flex rounded-control bg-brand px-3 py-1 text-[1.125rem] font-medium text-brand-on">
              {poster.categoryName}
            </span>
            <h1 className="mt-4 break-keep text-display tracking-tight text-ink">
              {poster.title}
            </h1>
            {poster.subtitle && (
              <p className="mt-4 text-[1.5rem] text-ink-muted">{poster.subtitle}</p>
            )}
          </div>

          <div className="mt-8 space-y-3">
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

          <div className="mt-auto flex items-center gap-5 pt-8">
            <QRCodeBox value={poster.detailUrl} size="xl" />
            <div>
              <p className="text-[1.0625rem] leading-relaxed text-ink-muted">
                포스터의 자세한 내용은
                <br />
                QR을 스캔해 확인하세요.
              </p>
              <a
                href={poster.detailUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-[1.25rem] font-medium text-brand-strong"
              >
                Ziggle에서 자세히 보기
                <ChevronRight className="size-5" aria-hidden="true" />
              </a>
            </div>
          </div>
        </section>

        <section className="flex flex-1 items-center justify-center">
          <div className="aspect-[3/4] h-full max-h-full overflow-hidden rounded-card bg-surface shadow-floating ring-1 ring-line">
            <PosterArtwork poster={poster} fit="cover" />
          </div>
        </section>
      </div>
    </div>
  );
}
