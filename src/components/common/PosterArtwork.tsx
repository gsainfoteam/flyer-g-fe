import { useState } from "react";
import type { PosterRenderModel } from "@/entities/poster";
import { formatSeoulDate } from "@/shared/lib/datetime";
import { cn } from "@/shared/lib/utils";

/**
 * 포스터 이미지를 그린다. 이미지를 불러오지 못하면 콘텐츠 정보로 만든 대체 화면을
 * 보여준다. 한 항목의 미디어 오류가 화면 전체를 망가뜨리지 않게 하기 위한 것이다.
 * (명세 FR-PLY-06)
 *
 * 실패 항목을 아예 건너뛰는 처리는 플레이어 몫이라 Phase 05에서 다룬다.
 */
const gradients = [
  "from-violet-500 via-fuchsia-400 to-orange-300",
  "from-sky-400 via-violet-400 to-fuchsia-300",
  "from-emerald-400 via-teal-300 to-violet-300",
  "from-orange-400 via-rose-300 to-violet-400",
  "from-indigo-500 via-purple-400 to-pink-300",
  "from-amber-300 via-orange-300 to-violet-400",
  "from-rose-400 via-fuchsia-400 to-indigo-400",
  "from-teal-400 via-sky-400 to-violet-400",
];

interface PosterArtworkProps {
  poster: PosterRenderModel;
  /** contain은 원본 비율 유지(TV·미리보기), cover는 슬롯 채우기(썸네일) */
  fit?: "contain" | "cover";
  className?: string;
  /** 이미지 로드에 실패했을 때 호출한다. 플레이어가 항목을 건너뛸 때 쓴다. */
  onLoadError?: (posterId: string) => void;
}

function hashToIndex(value: string, length: number) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) % 100000;
  }
  return hash % length;
}

export function PosterArtwork({
  poster,
  fit = "contain",
  className,
  onLoadError,
}: PosterArtworkProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const gradient = gradients[hashToIndex(poster.id, gradients.length)];

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
        "relative flex h-full w-full flex-col justify-between bg-gradient-to-br text-white",
        gradient,
        className,
      )}
      style={{ containerType: "size", padding: "7cqw" }}
      role="img"
      aria-label={`${poster.title} 포스터 대체 이미지`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_18%,rgba(255,255,255,0.45),transparent_30%),radial-gradient(circle_at_82%_2%,rgba(255,255,255,0.25),transparent_26%)]" />
      <div className="relative">
        <span
          className="inline-block rounded-pill bg-white/25 font-black backdrop-blur"
          style={{ fontSize: "3.2cqw", padding: "1.4cqw 3cqw" }}
        >
          {poster.categoryName}
        </span>
      </div>
      <div className="relative" style={{ marginBottom: "1cqw" }}>
        <p className="font-bold text-white/85" style={{ fontSize: "3cqw" }}>
          {poster.organizationName}
        </p>
        <h3
          className="break-keep font-black tracking-tight"
          style={{ fontSize: "7.5cqw", lineHeight: 1.05, marginTop: "2cqw" }}
        >
          {poster.title}
        </h3>
        {poster.subtitle && (
          <p
            className="break-keep font-semibold text-white/85"
            style={{ fontSize: "3.2cqw", marginTop: "2.5cqw" }}
          >
            {poster.subtitle}
          </p>
        )}
      </div>
      <div className="relative flex items-end justify-between">
        <span className="font-bold text-white/85" style={{ fontSize: "3cqw" }}>
          {formatSeoulDate(poster.startAt)}
        </span>
      </div>
    </div>
  );
}
