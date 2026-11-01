import { LogoMark } from "@/shared/components";

/**
 * 소개 화면의 TV 모습. 예시 데이터로 그린 이벤트 장면이다(실제 편성이 아니다).
 *
 * TV 틀(머리 줄·카드·하단 정보줄)을 화면 폭에 맞춰 줄인다. 글자 크기는 컨테이너 폭
 * 기준(cqw)이라 어느 폭에서도 1920×1080 비율 그대로 보인다. (기획 3-1)
 */
export function TvSample() {
  return (
    <figure className="relative m-0 min-w-0">
      <div className="rounded-[1.125rem] bg-zinc-800 p-2.5 shadow-[0_30px_60px_rgb(0_0_0/0.45)]">
        <div className="@container">
          <div className="flex aspect-video flex-col overflow-hidden rounded-[0.625rem] bg-stage text-hero-ink">
            <div className="flex min-h-0 flex-1 flex-col gap-[1.5cqw] px-[4.2cqw] pt-[2.9cqw] pb-[1.7cqw]">
              <div className="flex h-[2.9cqw] items-center gap-[0.8cqw] text-[1.3cqw] font-extrabold">
                <LogoMark className="size-[2.4cqw]" />
                전단지
                <span className="ml-[0.4cqw] font-normal text-zinc-400">
                  A동 로비 1
                </span>
              </div>
              <div className="flex min-h-0 flex-1 gap-[3.3cqw] rounded-[1.25cqw] bg-hero-raised px-[5cqw] py-[3.75cqw]">
                <div className="flex min-w-0 flex-1 flex-col justify-center gap-[1.9cqw]">
                  <span className="self-start rounded-pill bg-accent px-[1.35cqw] py-[0.52cqw] text-[1.56cqw] font-bold text-accent-on">
                    생일 축하
                  </span>
                  <p className="m-0 text-[5.4cqw] leading-[1.15] font-extrabold tracking-[-0.035em]">
                    지민아, 생일 축하해
                  </p>
                  <p className="m-0 text-[2.7cqw] leading-[1.4] font-bold">
                    스물한 살 생일 축하해! 오늘 하루는 네가 주인공
                  </p>
                  <p className="m-0 text-[1.9cqw] text-hero-muted">3층 친구들이</p>
                </div>
                <div className="flex flex-none flex-col items-center justify-center gap-[1.25cqw]">
                  <div className="flex size-[12.5cqw] items-center justify-center rounded-[0.2cqw] bg-white text-[1.7cqw] font-extrabold text-stage">
                    QR
                  </div>
                  <p className="m-0 text-[2cqw] font-extrabold">나도 올리기</p>
                </div>
              </div>
            </div>
            <div className="flex h-[4.4cqw] flex-none items-center gap-[2.1cqw] bg-hero px-[2.5cqw] text-[1.35cqw]">
              <b className="text-[1.8cqw]">12:11</b>
              <span>맑음 14°</span>
              <span>종강 D-50</span>
              <span className="text-zinc-300">점심 11:30–13:30</span>
            </div>
          </div>
        </div>
      </div>
      <div
        aria-hidden="true"
        className="mx-auto h-2.5 w-36 rounded-b-lg bg-zinc-800"
      />
      <figcaption className="absolute top-6 left-6 inline-flex h-6.5 items-center gap-1.5 rounded-pill bg-stage/80 px-2.5 text-overline text-white">
        <span className="size-1.75 rounded-full bg-accent" />
        예시 화면
      </figcaption>
    </figure>
  );
}
