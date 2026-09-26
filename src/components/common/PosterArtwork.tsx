import { useState } from "react";
import type { PosterRenderModel } from "@/entities/poster";
import { cn } from "@/shared/lib/utils";

/**
 * 포스터 이미지.
 *
 * 불러오지 못하면 자리를 비우지 않고 "없음"을 밝힌다. 한 항목의 미디어 오류가
 * 화면 전체를 망가뜨리지 않게 하기 위한 것이다. (명세 FR-PLY-06)
 *
 * 대체 화면은 조용하다. 자리표시자가 실제 포스터보다 눈에 띄면 화면의 정보
 * 위계가 무너진다. 오류 코드는 절대 띄우지 않는다.
 *
 * 실패는 URL 단위로 기억한다. 같은 자리에서 다음 포스터로 넘어가거나 이미지를
 * 새로 올리면 다시 시도해야 하기 때문이다. 실패 항목을 편성에서 건너뛰는 처리는
 * 플레이어 몫이다.
 */
interface PosterArtworkProps {
  poster: PosterRenderModel;
  /** contain은 원본 비율 유지(TV·미리보기), cover는 슬롯 채우기(썸네일) */
  fit?: "contain" | "cover";
  className?: string;
  /** 이미지 로드에 실패했을 때 호출한다. 플레이어가 항목을 건너뛸 때 쓴다. */
  onLoadError?: (posterId: string) => void;
}

export function PosterArtwork({
  poster,
  fit = "contain",
  className,
  onLoadError,
}: PosterArtworkProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const imageFailed = failedUrl !== null && failedUrl === poster.posterUrl;

  if (poster.posterUrl && !imageFailed) {
    return (
      <img
        src={poster.posterUrl}
        alt={`${poster.title} 포스터`}
        className={cn(
          "h-full w-full bg-canvas",
          fit === "cover" ? "object-cover" : "object-contain",
          className,
        )}
        onError={() => {
          setFailedUrl(poster.posterUrl);
          onLoadError?.(poster.id);
        }}
      />
    );
  }

  return (
    <div
      className={cn(
        "@container grid h-full w-full place-items-center bg-canvas text-center",
        className,
      )}
      role="img"
      aria-label={`${poster.title} 포스터 없음`}
    >
      <span className="px-[6cqw] text-[max(11px,9cqw)] leading-tight text-ink-subtle @[7rem]:text-[max(12px,4cqw)]">
        포스터
        <br />
        없음
      </span>
    </div>
  );
}
