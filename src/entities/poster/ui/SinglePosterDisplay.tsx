import type { PosterRenderModel } from "@/entities/poster";
import { cn } from "@/shared/lib/utils";
import { ZIGGLE_HOST } from "@/shared/lib/ziggle-url";
import { Logo } from "@/shared/components/Logo";
import { PosterArtwork } from "@/entities/poster/ui/PosterArtwork";
import { QRCodeBox } from "@/shared/components/QRCodeBox";
import { LiveClock } from "@/shared/components/LiveClock";
import { TV_STAGE_PADDING } from "@/entities/poster/ui/stage-metrics";

/**
 * TV 단일 레이아웃.
 *
 * 2~5m 거리에서 지나가며 몇 초 본다. 제목이 가장 먼저 읽히고, 그다음 장소·주최,
 * 마지막이 QR이다. 치수는 1920x1080 실측 px이며 `ScaledStage`가 화면에 맞춘다.
 * (명세 9.6)
 *
 * 글이 길어 넘치면 글 쪽이 잘리고 QR은 항상 온전히 남는다. QR이 잘리면 원문으로
 * 갈 방법이 없다. 상세 링크 없이 신청한 게시물은 QR 칸 없이 그린다.
 *
 * 게시 기간은 보여주지 않는다. TV 앞의 학생은 "기간"을 행사 일시로 읽는데, 이
 * 값은 TV에 걸리는 기간일 뿐이다. 행사 일시는 포스터와 부제가 말한다.
 *
 * 배경에는 지금 포스터를 크게 흐려 깔아 화면 전체가 포스터의 색을 따르게 한다.
 * 흐림은 1/4 크기에서 계산해 키운다. 전체 화면 크기로 흐리면 TV용 저사양 기기에서
 * 포스터가 바뀔 때마다 프레임이 끊긴다. (명세 9.2)
 */
interface SinglePosterDisplayProps {
  poster: PosterRenderModel;
  deviceLabel: string | null;
  /** 편성 판정의 기준이 되는 서버 시각. 모르면 시계는 기기 시각으로 흐른다. */
  serverTime: Date | null;
  clockTicking?: boolean;
  onPosterError?: (posterId: string) => void;
  onPosterLoad?: (posterId: string) => void;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-8">
      <span className="w-[110px] shrink-0 text-[28px] font-semibold text-ink-subtle">
        {label}
      </span>
      <span className="min-w-0 truncate text-[38px] font-bold text-ink">
        {value}
      </span>
    </div>
  );
}

/** 이 길이를 넘는 제목은 한 단계 작게 써서 세 줄 안에 담는다. */
const LONG_TITLE_LENGTH = 26;

export function SinglePosterDisplay({
  poster,
  deviceLabel,
  serverTime,
  clockTicking = false,
  onPosterError,
  onPosterLoad,
}: SinglePosterDisplayProps) {
  const titleClassName =
    poster.title.length > LONG_TITLE_LENGTH
      ? "text-[64px] leading-[1.15]"
      : "text-[88px] leading-[1.08]";

  return (
    <div className="relative isolate flex h-full gap-[72px]">
      {/* 스테이지 여백 밖까지 채우는 앰비언트 배경. 장식이 아니라 조명이다. */}
      {poster.posterUrl && (
        <div
          aria-hidden="true"
          className="absolute -z-10 overflow-hidden"
          style={{ inset: -TV_STAGE_PADDING }}
        >
          <img
            src={poster.posterUrl}
            alt=""
            className="absolute top-0 left-0 h-1/4 w-1/4 origin-top-left scale-[4.4] object-cover opacity-30 blur-[28px] saturate-[1.35]"
          />
          <div className="absolute inset-0 bg-linear-to-r from-stage/85 via-stage/55 to-transparent" />
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center gap-4">
          <Logo size="tv" />
          {deviceLabel && (
            <span className="ml-2 text-[26px] text-ink-subtle">
              {deviceLabel}
            </span>
          )}
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <span className="mt-8 self-start rounded-pill bg-accent px-[26px] py-2.5 text-[30px] font-bold text-accent-on">
            {poster.categoryName}
          </span>

          <h1
            className={cn(
              "mt-6 line-clamp-3 shrink-0 font-extrabold tracking-tight text-ink",
              titleClassName,
            )}
          >
            {poster.title}
          </h1>
          {poster.subtitle && (
            <p className="mt-5 line-clamp-2 shrink-0 text-[40px] text-ink-muted">
              {poster.subtitle}
            </p>
          )}

          {(poster.location || poster.organizerName) && (
            <div className="mt-8 flex flex-col gap-4">
              {poster.location && (
                <InfoRow label="장소" value={poster.location} />
              )}
              {poster.organizerName && (
                <InfoRow label="주최" value={poster.organizerName} />
              )}
            </div>
          )}
        </div>

        {/* 상세 링크 없이 신청한 게시물은 QR 칸을 그리지 않는다. */}
        {poster.detailUrl && (
          <div className="mt-6 flex shrink-0 items-center gap-9 self-start rounded-tv-card bg-white/[0.06] py-5 pr-12 pl-6 ring-1 ring-white/10">
            <QRCodeBox value={poster.detailUrl} size="tv" />
            <div>
              <p className="text-[38px] font-extrabold text-ink">
                Ziggle에서 자세히 보기
              </p>
              <p className="mt-2.5 text-[27px] leading-normal text-ink-muted">
                QR을 스캔하면 공지 원문으로 갑니다
                <br />
                {ZIGGLE_HOST}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="flex shrink-0 flex-col items-end gap-7">
        <LiveClock
          now={serverTime ?? undefined}
          ticking={clockTicking || serverTime === null}
          className="text-[32px]"
        />
        <div className="aspect-3/4 min-h-0 flex-1 overflow-hidden rounded-tv-card shadow-poster-lg ring-1 ring-white/10">
          <PosterArtwork
            poster={poster}
            fit="cover"
            onLoadError={onPosterError}
            onLoad={onPosterLoad}
          />
        </div>
      </div>
    </div>
  );
}
