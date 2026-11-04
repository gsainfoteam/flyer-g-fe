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
 *
 * 링크·이미지·해상도는 포스터에만 있는 것이라 포스터일 때만 본다. 기간은 모든
 * 종류에 본다(승인 전 제보는 기간이 아직 없다).
 *
 * 이벤트 배너·제보는 글에 전화번호·메일 같은 연락처가 있는지 본다(개인정보 노출 반려
 * 사유). 이벤트 사진은 받는 사람 동의가 있는지 다시 확인한다.
 */
const CONTACT_PATTERN =
  /(01[016789][-.\s]?\d{3,4}[-.\s]?\d{4})|([\w.+-]+@[\w-]+\.[\w.]+)/;

/** 연락처처럼 보이는 글이 있는가. 거르지 않고 관리자에게 짚어 주기만 한다. */
function hasContactInfo(text: string | null | undefined): boolean {
  return text ? CONTACT_PATTERN.test(text) : false;
}
interface ReviewWarningsProps {
  submission: SignageSubmissionExpanded;
  /** 판정 기준이 되는 서버 시각 */
  serverNow: Date;
}

export function ReviewWarnings({ submission, serverNow }: ReviewWarningsProps) {
  const isPoster = submission.type === "POSTER";
  const now = serverNow.getTime();

  const warnings: { key: string; title: string; detail: string }[] = [];

  if (isPoster && submission.detailUrl === null) {
    warnings.push({
      key: "link-missing",
      title: "상세 링크 없음 · QR 없이 게시",
      detail:
        "상세 정보는 포스터에서만 확인할 수 있습니다. 필요한 정보가 모두 포함되어 있는지 확인하세요.",
    });
  } else if (
    isPoster &&
    submission.detailUrl !== null &&
    !isAllowedZiggleUrl(submission.detailUrl)
  ) {
    warnings.push({
      key: "link",
      title: "공식 Ziggle 주소가 아닌 상세 링크",
      detail: `QR이 ${submission.detailUrl} 로 연결됩니다. 승인 전에 반드시 확인하세요.`,
    });
  }

  // 기간은 승인 전 제보처럼 아직 없을 수 있다.
  if (submission.endAt && submission.endAt.getTime() <= now) {
    warnings.push({
      key: "period-ended",
      title: "게시 기간 경과",
      detail: "승인해도 TV에 게시되지 않습니다. 기간 문제로 반려를 검토하세요.",
    });
  } else if (submission.startAt && submission.startAt.getTime() <= now) {
    warnings.push({
      key: "period-live",
      title: "게시 시작 시각 경과",
      detail: "승인하는 즉시 게시가 시작됩니다.",
    });
  }

  const size =
    submission.posterWidth !== null && submission.posterHeight !== null
      ? { width: submission.posterWidth, height: submission.posterHeight }
      : null;
  if (isPoster && !submission.posterUrl) {
    warnings.push({
      key: "poster-missing",
      title: "포스터 이미지 없음",
      detail: "이미지 없이 승인하면 TV에 빈 칸이 나갑니다.",
    });
  } else if (isPoster && size && isLowResolution(size)) {
    warnings.push({
      key: "poster-small",
      title: `낮은 포스터 해상도 (${size.width}×${size.height})`,
      detail:
        "TV에서 확대되어 흐리게 보일 수 있습니다. 글자가 읽히는지 확인하고, 어려우면 저해상도로 반려하세요.",
    });
  }

  const banner = submission.eventBanner;
  const writing = [
    submission.story?.body,
    banner?.recipient,
    banner?.headline,
    banner?.message,
    banner?.sender,
  ];
  if (writing.some(hasContactInfo)) {
    warnings.push({
      key: "contact",
      title: "연락처 포함",
      detail:
        "TV에 연락처가 그대로 표시됩니다. 본인이 밝힌 것인지 확인하고, 아니면 개인정보 노출로 반려하세요.",
    });
  }
  if (banner?.photoUrl && !banner.photoConsent) {
    warnings.push({
      key: "photo-consent",
      title: "사진 속 인물의 게시 동의 미확인",
      detail: "동의 없이 사진을 TV에 게시할 수 없습니다. 반려하세요.",
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
