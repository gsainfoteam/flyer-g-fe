import { AlertTriangle } from "lucide-react";
import type { SignageSubmissionExpanded } from "@/entities/submission";
import { isAllowedZiggleUrl } from "@/shared/lib/ziggle-url";
import { isLowResolution } from "../model/poster-resolution";
import { Alert, AlertDescription, AlertTitle } from "@/shared/ui/alert";

/**
 * 검토 전 자동 경고 (명세 FR-REV-02).
 *
 * 관리자가 놓치기 쉬운 문제를 미리 짚는다: 공식이 아닌 링크, QR 없는 게시, 지난 기간, 없는
 * 포스터, 낮은 해상도. 경고는 판단을 돕는 것이지 승인·반려를 막지 않는다 — 최종
 * 판단은 사람과 서버가 한다. 비율은 경고하지 않는다. 포스터·정방형·가로 배너를
 * 모두 받는다.
 */
interface ReviewWarningsProps {
  submission: SignageSubmissionExpanded;
  /** 판정 기준이 되는 서버 시각 */
  serverNow: Date;
}

export function ReviewWarnings({ submission, serverNow }: ReviewWarningsProps) {
  const size = {
    width: submission.posterWidth,
    height: submission.posterHeight,
  };
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
  } else if (isLowResolution(size)) {
    warnings.push({
      key: "poster-small",
      title: `포스터 해상도가 낮아요 (${size.width}×${size.height})`,
      detail:
        "TV에서 늘려 그려 흐리게 보일 수 있어요. 글자가 읽히는지 확인하고, 어려우면 저해상도로 반려하세요.",
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
