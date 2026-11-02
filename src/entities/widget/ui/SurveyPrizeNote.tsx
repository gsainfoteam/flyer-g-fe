import { Gift } from "lucide-react";
import { seoulDateKey } from "../model/content";
import { surveyPrizeOn } from "../model/operation";

/**
 * 폰 결과 화면의 설문 카드에 붙이는 경품 안내. 응모 마감이 지나면 그리지 않는다.
 * 응모에 필요한 정보(이름·학번·전화번호)는 설문(노션폼)에서 받는다.
 */
export function SurveyPrizeNote() {
  const prize = surveyPrizeOn(seoulDateKey(new Date()));
  if (!prize) return null;
  return (
    <p className="mt-2 flex items-start gap-2 rounded-control bg-warning-subtle px-3 py-2 text-label text-ink">
      <Gift aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-warning" />
      <span>
        <b>{prize.headline}</b> · {prize.note}
        <br />
        <span className="text-ink-muted">설문 끝에 이름·학번·전화번호를 적으면 응모돼요.</span>
      </span>
    </p>
  );
}
