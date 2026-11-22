import { fromSubmissionView } from "@/entities/poster";
import { PosterThumb } from "@/entities/poster/ui/PosterThumb";
import { cn } from "@/shared/lib/utils";
import { KIND_INFO } from "../model/kind";
import type { SubmissionView } from "../model/types";
import { KIND_STYLE } from "./kind-style";

const sizeClass = {
  sm: { box: "w-10", icon: 18 },
  md: { box: "w-12", icon: 20 },
} as const;

/**
 * 목록의 신청 썸네일.
 *
 * 이미지가 있으면 포스터 썸네일을, 없으면(제보, 문구로 만든 이벤트 배너, 이미지 없이
 * 취소된 신청) 종류 색 타일을 그린다. "포스터 없음" 같은 빈 칸 대신 무슨 컨텐츠인지
 * 알려 준다. 이미지를 불러오지 못한 경우는 `PosterArtwork`가 따로 처리한다.
 */
export function SubmissionThumb({
  submission,
  size = "sm",
  className,
}: {
  submission: SubmissionView;
  size?: keyof typeof sizeClass;
  className?: string;
}) {
  const poster = fromSubmissionView(submission);
  if (poster.posterUrl || poster.videoUrl) {
    return <PosterThumb poster={poster} size={size} className={className} />;
  }

  const style = KIND_STYLE[submission.type];
  const Icon = style.icon;
  return (
    <span
      role="img"
      aria-label={`${submission.title} ${KIND_INFO[submission.type].name}`}
      className={cn(
        "inline-flex aspect-3/4 shrink-0 items-center justify-center rounded-thumb",
        style.soft,
        sizeClass[size].box,
        className,
      )}
    >
      <Icon size={sizeClass[size].icon} strokeWidth={2} aria-hidden="true" />
    </span>
  );
}
