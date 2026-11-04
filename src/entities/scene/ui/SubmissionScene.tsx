import type { SubmissionView } from "@/entities/submission/model/types";
import { to } from "@/shared/config/routes";
import { EventScene } from "./EventScene";
import { SceneFrame } from "./SceneFrame";
import { StoryScene } from "./StoryScene";

/**
 * 이벤트 배너·제보 신청 한 건의 TV 장면. 상세와 심사 화면의 미리보기에 쓴다. 포스터는
 * 지금 플레이어 렌더러(`DisplayPreview`)가 그린다. 제보 장면의 옆 칸은 자리만 둔다.
 */
export function SubmissionScene({ view }: { view: SubmissionView }) {
  const origin = window.location.origin;
  if (view.story) {
    return (
      <SceneFrame>
        <StoryScene
          qrValue={`${origin}${to.newStory()}`}
          items={[
            { ...view.story },
            {
              tag: "NEWS",
              body: "다른 제보와 함께 두 장씩 표시",
              storyNumber: null,
              placeholder: true,
            },
          ]}
        />
      </SceneFrame>
    );
  }
  if (view.eventBanner) {
    const banner = view.eventBanner;
    return (
      <SceneFrame>
        <EventScene
          qrValue={`${origin}${to.newEvent()}`}
          content={{
            mode: banner.mode,
            occasion: banner.occasion,
            recipient: banner.recipient,
            headline: banner.headline,
            message: banner.message,
            sender: banner.sender,
            photoUrl: banner.photoUrl,
            imageUrl: banner.assetUrl,
          }}
        />
      </SceneFrame>
    );
  }
  return null;
}
