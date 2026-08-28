import type { PosterRenderModel } from "@/entities/poster";
import { cn } from "@/shared/lib/utils";
import { TV_STAGE_PADDING } from "./stage-metrics";
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
 *
 * 배경에는 지금 포스터를 크게 흐려 깔아 화면 전체가 포스터의 색을 따르게 한다.
 * 정지 이미지라 연산은 포스터가 바뀌는 순간 한 번뿐이다. (명세 9.2)
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
      <span className="w-[110px] shrink-0 text-[28px] font-semibold text-ink-subtle">
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
  // 제목은 최대 80자까지 들어온다(명세 6장). 짧은 제목은 크게, 긴 제목은 줄여서
  // 세 줄 안에 담는다. 늘어난 제목이 QR을 화면 밖으로 밀어내면 안 된다.
  const titleClassName =
    poster.title.length > 26
      ? "text-[68px] leading-[1.16]"
      : "text-[96px] leading-[1.08]";

  return (
    <div className="relative isolate flex h-full gap-[72px]">
      {/* 스테이지 여백 밖까지 채우는 앰비언트 배경. 장식이 아니라 조명이다. */}
      {poster.posterUrl && (
        <div
          aria-hidden="true"
          className="absolute -z-10 overflow-hidden"
          style={{
            inset: -TV_STAGE_PADDING,
          }}
        >
          <img
            src={poster.posterUrl}
            alt=""
            className="h-full w-full scale-125 object-cover opacity-30 blur-[110px] saturate-[1.35]"
          />
          <div className="absolute inset-0 bg-linear-to-r from-[#101012]/85 via-[#101012]/55 to-transparent" />
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-4">
          <Logo size="tv" />
          <span className="ml-2 text-[26px] text-ink-subtle">{deviceLabel}</span>
        </div>

        <span className="mt-14 self-start rounded-pill bg-accent px-[26px] py-2.5 text-[30px] font-bold text-accent-on">
          {poster.categoryName}
        </span>

        <h1
          className={cn(
            "mt-8 line-clamp-3 shrink-0 font-extrabold tracking-tight text-ink",
            titleClassName,
          )}
        >
          {poster.title}
        </h1>
        {poster.subtitle && (
          <p className="mt-6 line-clamp-2 shrink-0 text-[40px] text-ink-muted">
            {poster.subtitle}
          </p>
        )}

        <div className="mt-14 flex flex-col gap-6">
          <InfoRow
            label="기간"
            value={formatSeoulPeriodCompact(poster.startAt, poster.endAt)}
          />
          {poster.location && <InfoRow label="장소" value={poster.location} />}
          {poster.organizationName && (
            <InfoRow label="주최" value={poster.organizationName} />
          )}
        </div>

        <div className="mt-auto flex items-center gap-9 self-start rounded-[28px] bg-white/[0.06] py-7 pr-12 pl-8 ring-1 ring-white/10">
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
        <div className="aspect-3/4 h-full overflow-hidden rounded-[24px] shadow-[0_32px_90px_rgba(0,0,0,0.6)] ring-1 ring-white/10">
          <PosterArtwork poster={poster} fit="cover" onLoadError={onPosterError} />
        </div>
      </div>
    </div>
  );
}
