import type {
  EventBannerMode,
  EventBannerOccasion,
} from "@/entities/submission/model/types";
import { SceneCard, SceneQr } from "./SceneFrame";

/**
 * 이벤트 배너 장면 (기획 3절). 문구로 만들기는 말머리 + 크게 받는 사람 + 문구 +
 * 보낸 사람, 사진이 있으면 오른쪽에 둔다. 이미지 올리기는 카드 안에 이미지를 비율
 * 그대로 띄운다. QR은 "나도 이벤트 올리기"로 올리는 화면에 보낸다.
 *
 * 글자 단계는 TV 1920px 기준 핵심 104px(5.4cqw)다. 화면을 꽉 채우는 큰 글은 피한다.
 */
export interface EventSceneContent {
  mode: EventBannerMode;
  occasion: EventBannerOccasion | null;
  recipient: string;
  message: string | null;
  sender: string | null;
  /** 문구로 만들기의 사진 */
  photoUrl: string | null;
  /** 이미지 올리기의 배너 이미지 */
  imageUrl: string | null;
}

const TAG: Record<EventBannerOccasion, string> = {
  BIRTHDAY: "생일 축하",
  ADMISSION: "합격 축하",
  AWARD: "수상 축하",
  WELCOME: "환영",
  OTHER: "소식",
};

/** 받는 사람 뒤 조사(아/야)는 이름마다 달라 쓰지 않는다. */
const HEADLINE: Record<EventBannerOccasion, (name: string) => string> = {
  BIRTHDAY: (name) => `${name}, 생일 축하해`,
  ADMISSION: (name) => `${name}, 합격 축하해`,
  AWARD: (name) => `${name}, 수상 축하해`,
  WELCOME: (name) => `${name}, 환영해`,
  OTHER: (name) => `${name}에게`,
};

export function EventScene({
  content,
  qrValue,
}: {
  content: EventSceneContent;
  qrValue: string;
}) {
  const qr = <SceneQr label="나도 이벤트 올리기" value={qrValue} />;
  const recipient = content.recipient.trim() || "받는 사람";

  if (content.mode === "IMAGE") {
    return (
      <SceneCard qr={qr}>
        <div className="flex min-h-0 flex-1 items-center justify-center">
          {content.imageUrl ? (
            <img
              src={content.imageUrl}
              alt=""
              className="max-h-full max-w-full rounded-[0.8cqw] object-contain"
            />
          ) : (
            <span className="text-[2cqw] text-hero-muted">
              배너 이미지 자리
            </span>
          )}
        </div>
      </SceneCard>
    );
  }

  return (
    <SceneCard qr={qr}>
      <div className="flex min-h-0 flex-1 items-center gap-[3cqw]">
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-[1.9cqw]">
          <span className="self-start rounded-pill bg-accent px-[1.35cqw] py-[0.52cqw] text-[1.56cqw] font-bold text-accent-on">
            {content.occasion ? TAG[content.occasion] : "이벤트"}
          </span>
          <p className="text-[5.4cqw] leading-[1.15] font-extrabold tracking-[-0.035em] [overflow-wrap:anywhere]">
            {(content.occasion ? HEADLINE[content.occasion] : HEADLINE.OTHER)(
              recipient,
            )}
          </p>
          {content.message?.trim() && (
            <p className="text-[2.7cqw] leading-[1.4] font-bold [overflow-wrap:anywhere]">
              {content.message.trim()}
            </p>
          )}
          {content.sender?.trim() && (
            <p className="text-[1.9cqw] text-hero-muted">
              {/* 보낸 사람 뒤 조사(이/가)도 이름마다 달라 줄표로 둔다. */}—{" "}
              {content.sender.trim()}
            </p>
          )}
        </div>
        {content.photoUrl && (
          <img
            src={content.photoUrl}
            alt=""
            className="aspect-square h-[70%] flex-none rounded-[1cqw] object-cover"
          />
        )}
      </div>
    </SceneCard>
  );
}
