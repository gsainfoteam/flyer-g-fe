import { Gift } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { QRCodeBox } from "./QRCodeBox";

/**
 * 게임 화면 오른쪽 위 설문 QR 칸. 세 게임(클릭 배틀·컬링·전단지 피하기)이 함께 쓴다.
 *
 * 경품 안내(`prize`)가 있으면 경품을 칸의 주인공으로 크게 쓰고 테두리로 짚는다. 판이 막
 * 끝난 때가 폰을 들고 있어 응답하기 가장 좋은 때라, 결과 화면에서는 테두리를 더 굵게 한다.
 * 1920x1080 기준 px이다.
 */
export interface SurveyPrize {
  /** 크게 쓰는 경품 줄. 예: "추첨으로 소정의 상품" */
  headline: string;
  /** 아래 작은 줄. 예: "11/8까지 응모" */
  note: string;
}

export interface EventSurvey {
  url: string;
  label: string;
  prize?: SurveyPrize | null;
}

export function SurveyCorner({
  survey,
  finished,
  qrSize = "lg",
  className,
}: {
  survey: EventSurvey;
  finished: boolean;
  qrSize?: "lg" | "band";
  className?: string;
}) {
  const { prize } = survey;
  return (
    <section
      aria-label={survey.label}
      className={cn(
        "flex shrink-0 items-center gap-7 rounded-tv-card bg-surface py-4 pr-9 pl-4",
        finished ? "ring-6 ring-accent" : prize && "ring-4 ring-warning",
        className,
      )}
    >
      <QRCodeBox value={survey.url} size={qrSize} />
      {prize ? (
        <div className="flex flex-col gap-1">
          <p className="flex items-center gap-2 text-[26px] text-ink-muted">
            <Gift aria-hidden="true" className="size-7 text-warning" />
            {finished ? `경기 종료! ${survey.label} 참여하면` : `${survey.label} 참여하면`}
          </p>
          <p className="text-[44px] leading-tight font-extrabold text-warning">{prize.headline}</p>
          <p className="text-[30px] font-bold text-ink">{prize.note}</p>
        </div>
      ) : (
        <div>
          <p className="text-[30px] leading-tight font-extrabold text-ink">
            {finished ? "경기 종료!" : survey.label}
          </p>
          <p className="mt-2 text-[24px] leading-snug text-ink-muted">
            {finished ? `${survey.label} 참여` : "QR로 설문 참여"}
          </p>
        </div>
      )}
    </section>
  );
}
