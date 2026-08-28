import type { PosterRenderModel } from "@/entities/poster";
import { formatSeoulPeriodCompact } from "@/shared/lib/datetime";
import { Logo } from "../common/Logo";
import { PosterArtwork } from "../common/PosterArtwork";
import { QRCodeBox } from "../common/QRCodeBox";
import { LiveClock } from "./LiveClock";

/**
 * TV 단일 레이아웃.
 *
 * 2~5m 거리에서 지나가며 몇 초 본다. 제목이 가장 먼저 읽히고, 그다음 일시·장소,
 * 마지막이 QR이다. 크기는 관리자 웹 scale이 아니라 이 화면 전용이며 1920x1080
 * 실측 검증은 Phase 05에서 한다. (명세 9.6)
 */
interface SinglePosterDisplayProps {
  poster: PosterRenderModel;
  deviceLabel: string;
  /** 편성 판정의 기준이 되는 서버 시각 */
  serverTime: Date;
  clockTicking?: boolean;
  onPosterError?: (posterId: string) => void;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-8">
      <span className="w-[110px] shrink-0 text-[28px] text-ink-subtle">
        {label}
      </span>
      <span className="text-[38px] font-bold text-ink">{value}</span>
    </div>
  );
}

export function SinglePosterDisplay({
  poster,
  deviceLabel,
  serverTime,
  clockTicking = false,
  onPosterError,
}: SinglePosterDisplayProps) {
  return (
    <div className="flex h-full gap-[72px]">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-4">
          <Logo size="tv" />
          <span className="ml-2 text-[26px] text-ink-subtle">{deviceLabel}</span>
        </div>

        <span className="mt-14 self-start rounded-pill bg-accent px-[26px] py-2.5 text-[30px] font-bold text-accent-on">
          {poster.categoryName}
        </span>

        <h1 className="mt-8 text-[96px] leading-[1.1] font-extrabold tracking-tight text-ink">
          {poster.title}
        </h1>
        {poster.subtitle && (
          <p className="mt-6 text-[40px] text-ink-muted">{poster.subtitle}</p>
        )}

        <div className="mt-14 flex flex-col gap-6">
          <InfoRow
            label="게시"
            value={formatSeoulPeriodCompact(poster.startAt, poster.endAt)}
          />
          {poster.location && <InfoRow label="장소" value={poster.location} />}
          {poster.organizationName && (
            <InfoRow label="주최" value={poster.organizationName} />
          )}
        </div>

        <div className="mt-auto flex items-center gap-8 self-start rounded-[28px] bg-canvas px-8 py-7">
          <QRCodeBox value={poster.detailUrl} size="tv" />
          <div>
            <p className="text-[38px] font-extrabold text-ink">
              Ziggle에서 자세히 보기
            </p>
            <p className="mt-2.5 text-[27px] leading-normal text-ink-muted">
              QR을 스캔하면 공지 원문으로 갑니다
              <br />
              ziggle.gistory.me
            </p>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-7">
        <LiveClock now={serverTime} ticking={clockTicking} className="text-[32px]" />
        <div className="aspect-3/4 h-full overflow-hidden rounded-[24px]">
          <PosterArtwork poster={poster} fit="cover" onLoadError={onPosterError} />
        </div>
      </div>
    </div>
  );
}
