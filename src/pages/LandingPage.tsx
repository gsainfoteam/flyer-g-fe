import {
  ArrowRight,
  ChevronRight,
  CircleCheck,
  MonitorPlay,
  PenLine,
  ShieldCheck,
  Tv,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import type { SubmissionKind } from "@/entities/submission/model/kind";
import { KIND_INFO } from "@/entities/submission/model/kind";
import { TypeIcon } from "@/entities/submission/ui/TypeIcon";
import { useAuth } from "@/features/auth/model/auth-context";
import { IconTile, LogoMark } from "@/shared/components";
import { to } from "@/shared/config/routes";
import { EventArt, PosterArt, StoryArt } from "@/widgets/home/KindArt";
import { TvSample } from "@/widgets/home/TvSample";
import { SiteFooter } from "@/widgets/layout/SiteFooter";

/**
 * 로그인 전 첫 화면 (기획 4-0).
 *
 * 처음 온 사람의 질문 "이게 뭔지, 내 것도 올릴 수 있나"에 답한다. 한 문장 설명과
 * TV에 나오는 모습, 올릴 수 있는 세 가지, 진행 순서, QR 참여를 차례로 둔다.
 * 시작 버튼은 로그인 화면을 거치지 않고 바로 로그인한다.
 */
export function LandingPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [isPending, setIsPending] = useState(false);

  const start = async () => {
    setIsPending(true);
    try {
      const user = await signIn("/");
      if (user) void navigate(to.home(), { replace: true });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface text-ink">
      <section className="relative isolate overflow-hidden bg-stage text-hero-ink">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-40 -right-30 -z-10 size-[520px] rounded-full border-[64px] border-accent/12"
        />
        <nav
          aria-label="주 메뉴"
          className="mx-auto flex h-17 max-w-[1200px] items-center px-4 sm:px-8"
        >
          <span className="inline-flex items-center gap-2.5 text-[19px] font-extrabold tracking-[-0.02em]">
            <LogoMark className="size-7.5" />
            전단지
          </span>
          <button
            type="button"
            onClick={() => void start()}
            disabled={isPending}
            className="ml-auto inline-flex h-9.5 items-center rounded-pill border border-zinc-700 px-4 text-label font-semibold text-hero-ink transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            로그인
          </button>
        </nav>

        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-10 px-4 pt-8 pb-16 sm:px-8 lg:gap-14 lg:pt-12 lg:pb-20">
          <div className="min-w-0 flex-[1_1_420px]">
            <span className="inline-flex h-8 items-center gap-2 rounded-pill bg-white/8 px-3.5 text-caption font-semibold text-zinc-300">
              <Tv size={15} aria-hidden="true" />
              기숙사 로비 TV
            </span>
            <h1 className="mt-5 text-[2rem] leading-[1.2] font-black tracking-[-0.04em] sm:text-[2.75rem]">
              기숙사 <span className="text-accent">TV</span>로
              <br />
              전하는 우리 소식
            </h1>
            <p className="mt-5 max-w-[520px] text-[1.0625rem] leading-[1.65] text-hero-muted sm:text-lg">
              포스터부터 생일 축하, 소식 제보까지.
              <br />
              관리자 심사를 거쳐 기숙사 로비 TV에 게시됩니다.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-4.5 gap-y-3">
              <button
                type="button"
                onClick={() => void start()}
                disabled={isPending}
                className="inline-flex h-13.5 items-center gap-2.5 rounded-tile bg-accent px-6.5 text-[1.0625rem] font-extrabold text-accent-on transition-colors hover:bg-accent-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-70"
              >
                {isPending ? "이동하는 중…" : "인포팀 계정으로 로그인"}
                <ArrowRight size={20} strokeWidth={2.5} aria-hidden="true" />
              </button>
            </div>
          </div>
          <div className="min-w-0 flex-[1.15_1_440px]">
            <TvSample />
          </div>
        </div>
      </section>

      <main className="mx-auto flex max-w-[1200px] flex-col gap-16 px-4 pt-16 pb-14 sm:px-8 lg:pt-18">
        <section aria-labelledby="kinds" className="flex flex-col gap-6">
          <h2
            id="kinds"
            className="text-[1.75rem] font-black tracking-[-0.03em]"
          >
            게시 가능한 콘텐츠
          </h2>
          <div className="grid gap-5 md:grid-cols-3">
            <KindCard kind="POSTER" art={<PosterArt />}>
              동아리 모집, 공연·행사 안내. 지정한 기간이 끝나면 게시가 자동 종료됩니다.
            </KindCard>
            <KindCard kind="EVENT_BANNER" art={<EventArt />}>
              친구 생일, 합격·수상 소식. 받는 사람과 문구를 입력하면 TV 화면이 생성됩니다.
            </KindCard>
            <KindCard kind="STORY" art={<StoryArt />}>
              시설 수리, 분실물, 건의. 140자 이내로 작성하며, TV에는 작성자 이름이 표시되지 않습니다.
            </KindCard>
          </div>
        </section>

        <section aria-labelledby="flow" className="flex flex-col gap-7">
          <h2
            id="flow"
            className="text-[1.75rem] font-black tracking-[-0.03em]"
          >
            게시 절차
          </h2>
          {/* 네 단계를 같은 폭의 칸에 놓아 화면 폭을 채우고, 원의 가운데끼리 선으로 잇는다. */}
          <ol className="grid rounded-block bg-surface px-5 py-7 ring-1 ring-line sm:px-8 lg:grid-cols-4 lg:px-6 lg:py-9">
            <FlowStep
              step={1}
              when="올릴 때"
              icon={PenLine}
              title="콘텐츠 올리기"
            >
              이미지, 문구 업로드
            </FlowStep>
            <FlowStep
              step={2}
              when="올린 뒤"
              icon={ShieldCheck}
              title="관리자 심사"
            >
              반려 시 사유 확인
            </FlowStep>
            <FlowStep
              step={3}
              when="게시 기간"
              icon={MonitorPlay}
              title="TV에 게시"
            >
              기숙사 TV 화면에 노출
            </FlowStep>
            <FlowStep
              step={4}
              when="끝나는 날"
              icon={CircleCheck}
              title="게시 종료"
              last
            >
              기간 종료 시 TV 게시 자동 종료
            </FlowStep>
          </ol>
        </section>
      </main>

      {/* 다른 화면과 같은 바닥(약관·개인정보·문의). */}
      <SiteFooter />
    </div>
  );
}

function KindCard({
  kind,
  art,
  children,
}: {
  kind: SubmissionKind;
  art: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <article className="flex flex-col overflow-hidden rounded-block bg-surface ring-1 ring-line">
      <div className="flex flex-col gap-3 px-6 pt-6">
        <TypeIcon kind={kind} size="lg" />
        <h3 className="text-[1.375rem] font-extrabold tracking-[-0.02em]">
          {KIND_INFO[kind].name}
        </h3>
        <p className="text-body text-ink-muted">{children}</p>
      </div>
      <div aria-hidden="true" className="mt-6 flex-1">
        {art}
      </div>
    </article>
  );
}

/**
 * 진행 순서 한 단계. 넓은 화면은 칸 가운데 정렬로 원끼리 가로선으로 잇고, 좁은
 * 화면은 왼쪽 정렬로 세로선을 잇는다. 선 끝의 화살표가 순서를 알려 준다.
 * 모든 단계가 브랜드 빨강을 옅게 쓴 같은 원이다.
 */
function FlowStep({
  step,
  when,
  icon,
  title,
  last = false,
  children,
}: {
  step: number;
  when: string;
  icon: LucideIcon;
  title: string;
  last?: boolean;
  children: React.ReactNode;
}) {
  return (
    <li className="relative flex gap-4 pb-8 last:pb-0 lg:flex-col lg:items-center lg:gap-0 lg:px-3 lg:pb-0 lg:text-center">
      {!last && (
        <span
          aria-hidden="true"
          className="absolute top-14 bottom-1 left-7 w-0.5 bg-line-strong lg:top-7 lg:right-[calc(-50%+2.25rem)] lg:bottom-auto lg:left-[calc(50%+2.25rem)] lg:h-0.5 lg:w-auto"
        >
          <ChevronRight
            size={16}
            strokeWidth={2.5}
            className="absolute -right-[7px] -bottom-2 rotate-90 text-line-strong lg:-top-[7px] lg:bottom-auto lg:rotate-0"
          />
        </span>
      )}
      <IconTile
        icon={icon}
        size="lg"
        className="relative size-14 rounded-full bg-accent-100 text-accent-700 ring-2 ring-accent-200"
      />
      <div className="min-w-0 pt-1 lg:mt-4 lg:pt-0">
        <p className="text-caption font-bold text-ink-subtle">
          {step}단계 · {when}
        </p>
        <h3 className="mt-1 text-heading">{title}</h3>
        <p className="mt-1 text-label text-ink-muted">{children}</p>
      </div>
    </li>
  );
}
