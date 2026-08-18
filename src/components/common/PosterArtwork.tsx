import { ImageOff } from "lucide-react";
import { useState } from "react";
import type { PosterRenderModel } from "@/entities/poster";
import { formatSeoulDate } from "@/shared/lib/datetime";
import { cn } from "@/shared/lib/utils";

/**
 * 포스터 이미지를 그린다.
 *
 * 이미지를 불러오지 못하면 콘텐츠 정보로 만든 대체 화면을 보여준다. 한 항목의 미디어
 * 오류가 화면 전체를 망가뜨리지 않게 하기 위한 것이다. (명세 FR-PLY-06)
 *
 * 대체 화면은 장식적인 색을 쓰지 않는다. 자리표시자가 실제 포스터보다 눈에 띄면
 * 화면의 정보 위계가 무너진다. 중성 회색 위에 제목과 주최만 남긴다.
 *
 * 실패 항목을 아예 건너뛰는 처리는 플레이어 몫이라 Phase 05에서 다룬다.
 */
interface PosterArtworkProps {
  poster: PosterRenderModel;
  /** contain은 원본 비율 유지(TV·미리보기), cover는 슬롯 채우기(썸네일) */
  fit?: "contain" | "cover";
  className?: string;
  /** 이미지 로드에 실패했을 때 호출한다. 플레이어가 항목을 건너뛸 때 쓴다. */
  onLoadError?: (posterId: string) => void;
  /**
   * 대체 화면의 글자를 감춘다. 카드 오버레이처럼 바깥에서 같은 정보를 이미
   * 보여주고 있을 때 중복을 막는다.
   */
  hideFallbackText?: boolean;
}

export function PosterArtwork({
  poster,
  fit = "contain",
  className,
  onLoadError,
  hideFallbackText = false,
}: PosterArtworkProps) {
  const [imageFailed, setImageFailed] = useState(false);

  if (poster.posterUrl && !imageFailed) {
    return (
      <img
        src={poster.posterUrl}
        alt={`${poster.title} 포스터`}
        className={cn(
          "h-full w-full",
          fit === "cover" ? "object-cover" : "object-contain",
          className,
        )}
        onError={() => {
          setImageFailed(true);
          onLoadError?.(poster.id);
        }}
      />
    );
  }

  return (
    <div
      className={cn(
        "@container relative flex h-full w-full flex-col justify-between",
        "border border-line bg-surface-muted text-ink",
        className,
      )}
      role="img"
      aria-label={`${poster.title} 포스터 이미지 없음`}
    >
      {/* 아주 작은 썸네일과 오버레이가 있는 곳에서는 아이콘만 남긴다. */}
      <div
        className={cn(
          "grid h-full w-full place-items-center",
          !hideFallbackText && "@[7rem]:hidden",
        )}
      >
        <ImageOff className="size-8 max-h-1/3 max-w-1/3 text-ink-subtle" aria-hidden="true" />
      </div>

      <div
        className={cn(
          "hidden h-full flex-col justify-between p-[7cqw]",
          !hideFallbackText && "@[7rem]:flex",
        )}
      >
        <p
          className="font-medium text-ink-subtle"
          style={{ fontSize: "3.4cqw" }}
        >
          {poster.categoryName}
        </p>

        <div>
          <h3
            className="break-keep font-semibold tracking-tight"
            style={{ fontSize: "7cqw", lineHeight: 1.2 }}
          >
            {poster.title}
          </h3>
          {poster.subtitle && (
            <p
              className="mt-[2.5cqw] break-keep text-ink-muted"
              style={{ fontSize: "3.4cqw" }}
            >
              {poster.subtitle}
            </p>
          )}
        </div>

        <div
          className="flex items-end justify-between text-ink-subtle"
          style={{ fontSize: "3.2cqw" }}
        >
          <span>{poster.organizationName}</span>
          <span>{formatSeoulDate(poster.startAt)}</span>
        </div>
      </div>
    </div>
  );
}
