import {
  ArrowRight,
  CircleCheck,
  Gamepad2,
  MonitorPlay,
  PenLine,
  QrCode,
  ShieldCheck,
  Sparkles,
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
import { cn } from "@/shared/lib/utils";
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
            <h1 className="mt-5 text-[2.5rem] leading-[1.15] font-black tracking-[-0.04em] sm:text-[3.5rem]">
              기숙사 <span className="text-accent">TV</span>에
              <br />
              띄우고 싶은 게
              <br />
              있나요?
            </h1>
            <p className="mt-5 max-w-[520px] text-[1.0625rem] leading-[1.65] text-hero-muted sm:text-lg">
              포스터부터 생일 축하, 익명 제보까지. 올리면 관리자가 확인하고
              기숙사 로비 TV에 띄워요.
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
            이런 걸 올릴 수 있어요
          </h2>
          <div className="grid gap-5 md:grid-cols-3">
            <KindCard kind="POSTER" art={<PosterArt />}>
              동아리 모집, 공연·행사 안내. 기간을 정하면 끝나는 날 저절로
              내려가요.
            </KindCard>
            <KindCard kind="EVENT_BANNER" art={<EventArt />}>
              친구 생일, 합격·수상 소식. 받는 사람과 문구만 쓰면 TV 화면이
              만들어져요.
            </KindCard>
            <KindCard kind="STORY" art={<StoryArt />}>
              고쳐진 시설, 분실물, 건의. 140자 안으로 쓰면 이름 없이 TV에
              나가요.
            </KindCard>
          </div>
        </section>

        <section aria-labelledby="flow" className="flex flex-col gap-7">
          <h2 id="flow" className="text-[1.75rem] font-black tracking-[-0.03em]">
            올리면 이렇게 돼요
          </h2>
          <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <FlowStep icon={PenLine} title="올리기">
              쓰는 동안 자동 저장
            </FlowStep>
            <FlowStep icon={ShieldCheck} title="하우스 관리자 심사">
              반려되면 사유를 알려 드려요
            </FlowStep>
            <FlowStep icon={MonitorPlay} title="TV에 게시" highlighted>
              여러 TV에서 번갈아 나와요
            </FlowStep>
            <FlowStep icon={CircleCheck} title="저절로 내려감">
              직접 뗄 필요 없어요
            </FlowStep>
          </ol>
        </section>

        <section
          aria-labelledby="play"
          className="flex flex-wrap items-center gap-x-6 gap-y-5 rounded-block bg-accent-100 px-6 py-7 sm:px-8"
        >
          <IconTile icon={QrCode} size="lg" className="bg-accent text-accent-on" />
          <div className="min-w-0 flex-[1_1_280px]">
            <h2 id="play" className="text-heading text-accent-800">
              TV 앞에서는 QR로 참여
            </h2>
            <p className="mt-1 text-body text-accent-800/85">
              폰으로 찍으면 바로 열려요. 답을 내거나 참가할 때만 로그인해요.
            </p>
          </div>
          <ul className="flex flex-wrap gap-2">
            {[
              { icon: Sparkles, label: "오늘의 퀴즈" },
              { icon: Gamepad2, label: "클릭 배틀" },
            ].map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="inline-flex h-9 items-center gap-1.5 rounded-pill bg-surface px-3.5 text-label font-semibold text-accent-800"
              >
                <Icon size={16} aria-hidden="true" />
                {label}
              </li>
            ))}
          </ul>
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

function FlowStep({
  icon,
  title,
  highlighted = false,
  children,
}: {
  icon: LucideIcon;
  title: string;
  highlighted?: boolean;
  children: React.ReactNode;
}) {
  return (
    <li className="flex flex-col gap-3">
      <IconTile
        icon={icon}
        size="lg"
        className={cn(
          "rounded-full",
          highlighted ? "bg-accent text-accent-on" : "bg-surface-muted text-ink",
        )}
      />
      <h3 className="text-subhead">{title}</h3>
      <p className="-mt-2 text-label text-ink-muted">{children}</p>
    </li>
  );
}

/** 포스터 카드의 그림. 세로 포스터 세 장이 꽂힌 모습 */
function PosterArt() {
  return (
    <div className="flex h-36 items-end justify-center gap-3 bg-type-poster-subtle px-6 pt-6">
      <div className="h-24 w-16 -rotate-3 rounded-t-md bg-type-poster opacity-85" />
      <div className="h-28 w-18 rounded-t-md bg-type-poster-bar" />
      <div className="h-20 w-16 rotate-3 rounded-t-md bg-type-poster-bright" />
    </div>
  );
}

/** 이벤트 카드의 그림. TV 카드 그대로의 작은 배너 */
function EventArt() {
  return (
    <div className="flex h-36 items-center bg-type-event-subtle px-6">
      <div className="w-full rounded-tile bg-hero-raised px-4 py-3.5 text-hero-ink">
        <span className="inline-flex rounded-pill bg-accent px-2 py-0.5 text-overline text-accent-on">
          합격 축하
        </span>
        <p className="mt-1.5 text-subhead">수현아, 합격 축하해</p>
        <p className="text-caption text-hero-muted">연구실 동기들이</p>
      </div>
    </div>
  );
}

/** 제보 카드의 그림. TV에 나오는 카드 두 장 */
function StoryArt() {
  return (
    <div className="flex h-36 items-center gap-2.5 bg-type-story-subtle px-6">
      {[
        { tag: "칭찬", body: "세탁실 건조기 2번이 고쳐졌어요!" },
        { tag: "분실물", body: "파란 텀블러 주웠어요" },
      ].map((card) => (
        <div
          key={card.tag}
          className="min-w-0 flex-1 rounded-tile bg-hero-raised px-3.5 py-3 text-caption text-hero-ink"
        >
          <b className="text-type-story-bright">{card.tag}</b>
          <p className="mt-0.5 line-clamp-2">{card.body}</p>
        </div>
      ))}
    </div>
  );
}
