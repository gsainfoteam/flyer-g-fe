import { STORY_TAG_LABELS } from "@/entities/submission/model/types";
import type { StoryTag } from "@/entities/submission/model/types";
import { cn } from "@/shared/lib/utils";
import { SceneCard, SceneQr } from "./SceneFrame";

/**
 * 소식 제보 장면 (기획 3절). 한 장면에 카드 두 장. 본문은 40px(2.1cqw), 80자를 넘으면
 * 32px(1.67cqw)로 줄인다. 번호는 승인할 때 붙고, 작성자는 어디에도 싣지 않는다.
 */
export interface StorySceneItem {
  tag: StoryTag;
  body: string;
  /** 승인 전이면 null */
  storyNumber: number | null;
  /** 작성 화면에서 내 제보 칸을 테두리로 짚는다. */
  highlighted?: boolean;
  /** 자리만 보여 주는 흐린 칸 */
  placeholder?: boolean;
}

const LONG_BODY = 80;

export function StoryScene({
  items,
  qrValue,
}: {
  items: StorySceneItem[];
  qrValue: string;
}) {
  return (
    <SceneCard qr={<SceneQr label="폰으로 제보하기" value={qrValue} />}>
      <div className="flex items-baseline gap-[1.6cqw]">
        <span className="rounded-pill bg-accent px-[1.35cqw] py-[0.52cqw] text-[1.56cqw] font-bold text-accent-on">
          소식 제보
        </span>
        <span className="text-[1.8cqw] font-bold text-hero-muted">
          이름 없이 전하는 이야기
        </span>
      </div>
      <div className="mt-[2cqw] grid min-h-0 flex-1 grid-cols-2 gap-[1.6cqw]">
        {items.slice(0, 2).map((item, index) => (
          <div
            key={index}
            className={cn(
              "min-w-0 overflow-hidden rounded-[0.8cqw] bg-[#2b2b30] px-[2.3cqw] py-[2cqw]",
              item.highlighted && "shadow-[inset_0_0_0_0.2cqw_#f6f6f7]",
              item.placeholder && "opacity-45",
            )}
          >
            <div className="flex items-baseline gap-[0.8cqw]">
              <b className="text-[1.8cqw]">{STORY_TAG_LABELS[item.tag]}</b>
              <span className="text-[1.35cqw] text-zinc-400">
                {item.storyNumber !== null ? `#${item.storyNumber}` : "#번호"}
              </span>
            </div>
            <p
              className={cn(
                "mt-[1cqw] leading-[1.5] whitespace-pre-line [overflow-wrap:anywhere]",
                item.body.length > LONG_BODY
                  ? "text-[1.67cqw]"
                  : "text-[2.1cqw]",
              )}
            >
              {item.body}
            </p>
          </div>
        ))}
      </div>
    </SceneCard>
  );
}
