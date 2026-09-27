import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { MEDIA_CONSTRAINTS } from "@/entities/media";
import type { SignageSubmissionExpanded } from "@/entities/submission";
import { isAllowedZiggleUrl } from "@/shared/lib/ziggle-url";
import { Alert, AlertDescription, AlertTitle } from "@/shared/ui/alert";

/**
 * 검토 전 자동 경고 (명세 FR-REV-02).
 *
 * 관리자가 놓치기 쉬운 문제를 미리 짚는다: 공식이 아닌 링크, QR 없는 게시, 지난 기간, 없는
 * 포스터, 낮은 해상도, 3:4가 아닌 비율. 경고는 판단을 돕는 것이지 승인·반려를
 * 막지 않는다 — 최종 판단은 사람과 서버가 한다.
 */
interface ReviewWarningsProps {
  submission: SignageSubmissionExpanded;
  /** 판정 기준이 되는 서버 시각 */
  serverNow: Date;
}

/** TV 칸은 세로 3:4다. 이만큼 벗어나면 위아래나 양옆이 크게 잘린다. */
const POSTER_RATIO = 3 / 4;
const RATIO_TOLERANCE = 0.08;

/** 포스터 실제 크기를 잰다. 못 재면 null이고 크기 경고를 하지 않는다. */
function usePosterSize(
  posterUrl: string,
): { width: number; height: number } | null {
  const [size, setSize] = useState<{ width: number; height: number } | null>(
    null,
  );

  useEffect(() => {
    if (!posterUrl) return;
    let alive = true;
    const image = new Image();
    image.onload = () => {
      if (alive && image.naturalWidth > 0) {
        setSize({ width: image.naturalWidth, height: image.naturalHeight });
      }
    };
    image.src = posterUrl;
    return () => {
      alive = false;
    };
  }, [posterUrl]);

  return size;
}

export function ReviewWarnings({ submission, serverNow }: ReviewWarningsProps) {
  const size = usePosterSize(submission.posterUrl);
  const shortEdge = size ? Math.min(size.width, size.height) : null;
  const ratio = size ? size.width / size.height : null;
  const now = serverNow.getTime();

  const warnings: { key: string; title: string; detail: string }[] = [];

  if (submission.detailUrl === null) {
    warnings.push({
      key: "link-missing",
      title: "상세 링크가 없어 QR 없이 게시돼요",
      detail:
        "학생이 자세한 내용을 볼 곳이 포스터뿐이에요. 포스터에 필요한 정보가 다 있는지 확인하세요.",
    });
  } else if (!isAllowedZiggleUrl(submission.detailUrl)) {
    warnings.push({
      key: "link",
      title: "상세 링크가 공식 Ziggle 주소가 아니에요",
      detail: `QR이 ${submission.detailUrl} 로 연결됩니다. 승인 전에 반드시 확인하세요.`,
    });
  }

  if (submission.endAt.getTime() <= now) {
    warnings.push({
      key: "period-ended",
      title: "게시 기간이 이미 지났어요",
      detail: "승인해도 TV에 걸리지 않아요. 기간 문제로 반려를 검토하세요.",
    });
  } else if (submission.startAt.getTime() <= now) {
    warnings.push({
      key: "period-live",
      title: "시작 시각이 이미 지났어요",
      detail: "승인하는 즉시 게시가 시작됩니다.",
    });
  }

  if (!submission.posterUrl) {
    warnings.push({
      key: "poster-missing",
      title: "포스터 이미지가 없어요",
      detail: "이미지 없이 승인하면 TV에 빈 칸이 나갑니다.",
    });
  } else if (
    shortEdge !== null &&
    shortEdge < MEDIA_CONSTRAINTS.minShortEdgePx
  ) {
    warnings.push({
      key: "poster-small",
      title: `포스터 해상도가 낮아요 (짧은 변 ${shortEdge}px)`,
      detail: `TV 기준 ${MEDIA_CONSTRAINTS.minShortEdgePx}px 이상을 권장해요. 저해상도로 반려를 검토하세요.`,
    });
  }

  if (
    submission.posterUrl &&
    ratio !== null &&
    Math.abs(ratio - POSTER_RATIO) > RATIO_TOLERANCE
  ) {
    warnings.push({
      key: "poster-ratio",
      title: `포스터 비율이 세로 3:4와 달라요 (${size!.width}×${size!.height})`,
      detail:
        "TV 칸에 맞추면서 가장자리가 잘려요. 미리보기에서 중요한 글자가 잘리지 않는지 확인하세요.",
    });
  }

  if (warnings.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {warnings.map((warning) => (
        <Alert key={warning.key} variant="warning">
          <AlertTriangle aria-hidden="true" />
          <AlertTitle>{warning.title}</AlertTitle>
          <AlertDescription>{warning.detail}</AlertDescription>
        </Alert>
      ))}
    </div>
  );
}
