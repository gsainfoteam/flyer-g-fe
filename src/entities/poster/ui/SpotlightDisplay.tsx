import type { PosterRenderModel } from "@/entities/poster";
import { hasKnownSize, posterAspect } from "@/entities/poster/model/types";
import { spotlightImageSize } from "@/entities/poster/model/spotlight-layout";
import { PosterArtwork } from "@/entities/poster/ui/PosterArtwork";
import { StageHeader } from "@/entities/poster/ui/StageHeader";
import {
  STAGE_HEADER_GAP,
  TV_STAGE_PADDING,
} from "@/entities/poster/ui/stage-metrics";
import { QRCodeBox } from "@/shared/components/QRCodeBox";
import { cn } from "@/shared/lib/utils";
import { ZIGGLE_HOST } from "@/shared/lib/ziggle-url";

/**
 * 하나씩 크게. 한 건을 원본 비율 그대로 크게 보여 주고 제목·장소·QR을 함께 둔다.
 *
 * 2~5m 거리에서 지나가며 몇 초 본다. 제목이 가장 먼저 읽히고, 그다음 장소·주최,
 * 마지막이 QR이다. 치수는 1920x1080 실측 px이며 `ScaledStage`가 화면에 맞춘다.
 * (명세 9.6)
 *
 * 배치는 비율로 고른다.
 * - 세로·정방형·16:9(비율 2 이하): 이미지를 왼쪽에, 글을 오른쪽에
 * - 그보다 넓은 배너: 이미지를 위에 화면 폭만큼, 글과 QR을 아래 한 줄에
 * 어느 쪽이든 이미지는 자르지 않는다.
 *
 * 글이 길어 넘치면 글 쪽이 잘리고 QR은 항상 온전히 남는다. QR이 잘리면 원문으로
 * 갈 방법이 없다. 상세 링크 없이 신청한 게시물은 QR 칸 없이 그린다.
 *
 * 게시 기간은 보여주지 않는다. TV 앞의 학생은 "기간"을 행사 일시로 읽는데, 이
 * 값은 TV에 걸리는 기간일 뿐이다. 행사 일시는 포스터와 부제가 말한다.
 *
 * 배경에는 지금 게시물을 크게 흐려 깔아 화면 전체가 그 색을 따르게 한다. 흐림은
 * 1/4 크기에서 계산해 키운다. 전체 화면 크기로 흐리면 TV용 저사양 기기에서
 * 화면이 바뀔 때마다 프레임이 끊긴다. (명세 9.2)
 */
interface SpotlightDisplayProps {
  poster: PosterRenderModel;
  /** 머리에 작게 보여 줄 다음 차례 */
  upNext?: PosterRenderModel[];
  deviceLabel: string | null;
  /** 편성 판정의 기준이 되는 서버 시각. 모르면 시계는 기기 시각으로 흐른다. */
  serverTime: Date | null;
  clockTicking?: boolean;
  onPosterError?: (posterId: string) => void;
  onPosterLoad?: (posterId: string) => void;
}

const COLUMN_GAP = 64;

/** 이 길이를 넘는 제목은 한 단계 작게 써서 줄 안에 담는다. */
const LONG_TITLE_LENGTH = 26;

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

function CategoryPill({ name }: { name: string }) {
  return (
    <span className="self-start rounded-pill bg-accent px-[26px] py-2.5 text-[30px] font-bold text-accent-on">
      {name}
    </span>
  );
}

function QrBlock({
  detailUrl,
  align,
}: {
  detailUrl: string;
  align: "start" | "end";
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center gap-9",
        align === "end" && "flex-row-reverse text-right",
      )}
    >
      <QRCodeBox value={detailUrl} size="tv" />
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
  );
}

function UpNext({ posters }: { posters: PosterRenderModel[] }) {
  if (posters.length === 0) return null;
  return (
    <div className="flex items-center gap-3">
      <span className="mr-1 text-[22px] font-bold text-ink-subtle">다음</span>
      {posters.map((poster) => (
        <img
          key={poster.id}
          src={poster.posterUrl}
          alt=""
          className="h-12 rounded-[6px] bg-canvas object-cover opacity-70"
          style={{ width: Math.min(144, posterAspect(poster) * 48) }}
        />
      ))}
    </div>
  );
}

export function SpotlightDisplay({
  poster,
  upNext = [],
  deviceLabel,
  serverTime,
  clockTicking = false,
  onPosterError,
  onPosterLoad,
}: SpotlightDisplayProps) {
  const image = spotlightImageSize(poster);
  const longTitle = poster.title.length > LONG_TITLE_LENGTH;

  const artwork = (
    <div
      className="shrink-0 overflow-hidden rounded-tv-card shadow-poster-lg ring-1 ring-white/10"
      style={{ width: image.width, height: image.height }}
    >
      <PosterArtwork
        poster={poster}
        fit={hasKnownSize(poster) ? "cover" : "contain"}
        onLoadError={onPosterError}
        onLoad={onPosterLoad}
      />
    </div>
  );

  return (
    <div
      className="relative isolate flex h-full flex-col"
      style={{ gap: STAGE_HEADER_GAP }}
    >
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
          <div
            className={cn(
              "absolute inset-0 from-stage/85 via-stage/55 to-transparent",
              image.stacked ? "bg-linear-to-t" : "bg-linear-to-l",
            )}
          />
        </div>
      )}

      <StageHeader
        deviceLabel={deviceLabel}
        serverTime={serverTime}
        clockTicking={clockTicking}
      >
        <UpNext posters={upNext} />
      </StageHeader>

      {image.stacked ? (
        <div className="flex min-h-0 flex-1 flex-col gap-8">
          {artwork}
          <div className="flex min-h-0 flex-1 items-end gap-12">
            <div className="flex min-w-0 flex-1 flex-col self-stretch overflow-hidden">
              <CategoryPill name={poster.categoryName} />
              <h1
                className={cn(
                  "mt-4 shrink-0 font-extrabold tracking-tight text-ink",
                  longTitle
                    ? "line-clamp-2 text-[52px] leading-[1.15]"
                    : "line-clamp-1 text-[68px] leading-[1.1]",
                )}
              >
                {poster.title}
              </h1>
              <p className="mt-auto truncate text-[32px] text-ink-muted">
                {[poster.subtitle, poster.location, poster.organizerName]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            {poster.detailUrl && (
              <QrBlock detailUrl={poster.detailUrl} align="end" />
            )}
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1" style={{ gap: COLUMN_GAP }}>
          {/* 높이를 다 채우지 못하는 가로 이미지는 세로 가운데에 둔다. */}
          <div className="flex shrink-0 items-center">{artwork}</div>
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <CategoryPill name={poster.categoryName} />
              <h1
                className={cn(
                  "mt-6 line-clamp-3 shrink-0 font-extrabold tracking-tight text-ink",
                  longTitle
                    ? "text-[64px] leading-[1.15]"
                    : "text-[88px] leading-[1.08]",
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
              <div className="mt-6">
                <QrBlock detailUrl={poster.detailUrl} align="start" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
