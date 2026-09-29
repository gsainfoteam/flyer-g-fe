import { Info } from "lucide-react";
import { useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router";
import { RETURN_TO_PARAM, safeReturnTo } from "@/shared/config/routes";
import { Logo } from "@/shared/components/Logo";
import { useAuth } from "@/features/auth/model/auth-context";
import { ErrorState, LoadingState } from "@/shared/components";
import { SERVICE_OPERATOR } from "@/shared/config/service-info";
import { Alert, AlertTitle } from "@/shared/ui/alert";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";

/**
 * 로그인 시작 화면.
 *
 * 전단지는 자체 계정을 두지 않는다. 인포팀 계정(GIST 메일)의 인증 제공자로 넘겼다가
 * 돌아온다.
 * 실제 연결 방식은 아직 확정되지 않아 adapter 뒤에 있다. (명세 FR-AUTH-01, 15장 13번)
 */
export function LoginPage() {
  const { state, signIn } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [isPending, setIsPending] = useState(false);

  const returnTo = safeReturnTo(params.get(RETURN_TO_PARAM));

  if (state.status === "initializing") {
    return (
      <Split>
        <LoadingState rows={2} label="로그인 상태를 확인하고 있어요." />
      </Split>
    );
  }

  // 이미 로그인했으면 원래 가려던 곳으로 보낸다.
  if (state.status === "authenticated") {
    return <Navigate to={returnTo} replace />;
  }

  const handleSignIn = async () => {
    setIsPending(true);
    try {
      const user = await signIn(returnTo);
      if (user) void navigate(returnTo, { replace: true });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Split>
      <h1 className="text-display text-ink">인포팀 계정으로 시작하세요</h1>
      <p className="mt-2.5 text-body text-ink-muted">
        GIST 메일로 바로 로그인할 수 있어요.
      </p>

      {state.status === "unauthenticated" && state.reason === "expired" && (
        <Alert variant="info" className="mt-6 text-left">
          <Info aria-hidden="true" />
          {/* 돌아갈 화면 안내는 버튼 아래 문구가 맡는다. */}
          <AlertTitle>로그인이 만료되었어요</AlertTitle>
        </Alert>
      )}

      {state.status === "error" && (
        <ErrorState
          error={state.error}
          title="로그인하지 못했어요"
          className="mt-6 text-left"
        />
      )}

      <Button
        onClick={handleSignIn}
        disabled={isPending}
        size="lg"
        className="mt-8 w-full"
      >
        {isPending ? "이동하는 중…" : "인포팀 계정으로 로그인"}
      </Button>

      {returnTo !== "/" && (
        <p className="mt-4 text-caption text-ink-subtle">
          로그인하면 보고 있던 화면으로 돌아갑니다.
        </p>
      )}
    </Split>
  );
}

/**
 * 화면을 나눈다. 넓은 화면에서는 왼쪽이 로그인, 오른쪽이 전단 게시판이다.
 * 좁은 화면에서는 로그인을 엄지가 닿는 아래쪽에 가운데 정렬로 모으고, 남는
 * 위쪽을 게시판이 채운다.
 */
function Split({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas text-ink lg:flex-row">
      <FlyerBoard className="min-h-56 flex-1 lg:order-2" />
      <div className="flex flex-col px-6 pb-8 sm:px-10 lg:w-[min(560px,44%)] lg:flex-none lg:px-16 lg:py-12">
        {/* 로고는 로그인 내용과 한 덩어리로 둔다. 넓은 화면에서는 세로 가운데. */}
        <div className="mx-auto w-full max-w-sm text-center lg:mx-0 lg:my-auto lg:py-10 lg:text-left">
          <Logo size="lg" />
          <div className="mt-8 lg:mt-10">{children}</div>
        </div>
        <p className="mt-12 text-center text-caption text-ink-subtle lg:mt-0 lg:text-left">
          GIST 학사기숙사 로비 TV 게시판 · {SERVICE_OPERATOR}
        </p>
      </div>
    </div>
  );
}

/**
 * 장식용 전단 게시판. 꽂힌 전단들이 기둥째 천천히 오르내린다.
 *
 * 로그인과 칸이 나뉘어 있어 전단 색이 버튼과 다투지 않는다. 내용이 없는 그림이라
 * 보조기기에는 숨긴다. 움직임 줄이기를 켠 사용자에게는 멈춘 게시판이 보인다
 * (`index.css`의 prefers-reduced-motion 규칙).
 */
type FlyerTone =
  "accent" | "blush" | "info" | "sky" | "success" | "warning" | "paper";
type FlyerLayout = "photo" | "headline" | "badge";

interface FlyerSpec {
  tone: FlyerTone;
  layout: FlyerLayout;
  tilt: string;
}

// 원색 그대로면 게시판이 로그인보다 먼저 눈에 들어온다. 색을 흰색과 섞어 한 톤 낮춘다.
const TONES: Record<FlyerTone, { paper: string; block: string; bar: string }> =
  {
    accent: {
      paper: "bg-accent-300",
      block: "bg-white/40",
      bar: "bg-white/85",
    },
    blush: {
      paper: "bg-accent-100",
      block: "bg-accent-200",
      bar: "bg-accent-700/20",
    },
    info: {
      paper: "bg-[color-mix(in_srgb,var(--color-info)_45%,white)]",
      block: "bg-white/35",
      bar: "bg-white/85",
    },
    sky: {
      paper: "bg-info-subtle",
      block: "bg-info/20",
      bar: "bg-info-strong/20",
    },
    success: {
      paper: "bg-[color-mix(in_srgb,var(--color-success)_45%,white)]",
      block: "bg-white/35",
      bar: "bg-white/85",
    },
    warning: {
      paper: "bg-[color-mix(in_srgb,var(--color-warning)_45%,white)]",
      block: "bg-white/35",
      bar: "bg-white/85",
    },
    paper: { paper: "bg-surface", block: "bg-accent-100", bar: "bg-ink/10" },
  };

const FLYER_SET: readonly FlyerSpec[] = [
  { tone: "accent", layout: "photo", tilt: "-rotate-2" },
  { tone: "sky", layout: "headline", tilt: "rotate-1" },
  { tone: "paper", layout: "badge", tilt: "-rotate-1" },
  { tone: "success", layout: "photo", tilt: "rotate-2" },
  { tone: "blush", layout: "headline", tilt: "-rotate-1" },
  { tone: "warning", layout: "badge", tilt: "rotate-1" },
  { tone: "info", layout: "photo", tilt: "rotate-2" },
  { tone: "paper", layout: "headline", tilt: "-rotate-2" },
  { tone: "accent", layout: "badge", tilt: "rotate-1" },
];

/** 기둥마다 다른 전단, 다른 속도, 다른 방향, 다른 출발 높이. */
const COLUMNS = [
  { start: 0, duration: 95, reverse: false, offset: 40 },
  { start: 3, duration: 80, reverse: true, offset: 160 },
  { start: 6, duration: 110, reverse: false, offset: 0 },
  { start: 1, duration: 85, reverse: true, offset: 110 },
  { start: 4, duration: 100, reverse: false, offset: 200 },
  { start: 7, duration: 90, reverse: true, offset: 60 },
  { start: 2, duration: 105, reverse: false, offset: 140 },
] as const;

const FLYERS_PER_COLUMN = 6;

function FlyerBoard({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none relative overflow-hidden select-none",
        className,
      )}
    >
      {/*
        가장자리는 전단 자체를 서서히 지운다. 바탕을 페이지와 같은 색으로 두어
        게시판이 따로 떠 보이지 않고 로그인 쪽으로 자연스럽게 이어진다.
      */}
      <div className="absolute inset-0 flex justify-center gap-5 mask-t-from-80% mask-b-from-45% lg:gap-7 lg:mask-t-from-85% lg:mask-b-from-85% lg:mask-l-from-75%">
        {COLUMNS.map((column, columnIndex) => {
          const flyers = Array.from(
            { length: FLYERS_PER_COLUMN },
            (_, index) => FLYER_SET[(column.start + index) % FLYER_SET.length],
          );
          return (
            <div
              key={columnIndex}
              className="w-32 shrink-0 sm:w-40 lg:w-48"
              style={{ marginTop: -column.offset }}
            >
              <div
                className="flex animate-flyer-drift flex-col will-change-transform"
                style={{
                  animationDuration: `${column.duration}s`,
                  animationDirection: column.reverse ? "reverse" : "normal",
                }}
              >
                {/* 같은 목록을 두 번 이어 붙여 끊김 없이 반복한다. */}
                {[...flyers, ...flyers].map((flyer, index) => (
                  <Flyer key={index} {...flyer} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Flyer({ tone, layout, tilt }: FlyerSpec) {
  const t = TONES[tone];
  return (
    // 기울인 전단끼리 겹치지 않도록 간격은 바깥 여백으로 준다.
    <div className="py-3 lg:py-3.5">
      <div
        className={cn(
          "relative flex aspect-3/4 flex-col gap-2 overflow-hidden rounded-card p-4 shadow-floating",
          t.paper,
          tilt,
        )}
      >
        <span className="absolute top-2 left-1/2 size-2.5 -translate-x-1/2 rounded-pill bg-brand-pin/70" />
        {layout === "photo" && (
          <>
            <div className={cn("mt-3 h-1/2 rounded-thumb", t.block)} />
            <div className={cn("mt-1 h-2.5 w-4/5 rounded-thumb", t.bar)} />
            <div className={cn("h-2.5 w-1/2 rounded-thumb", t.bar)} />
          </>
        )}
        {layout === "headline" && (
          <>
            <div className={cn("mt-4 h-4 w-11/12 rounded-thumb", t.bar)} />
            <div className={cn("h-4 w-2/3 rounded-thumb", t.bar)} />
            <div className={cn("mt-auto h-2 w-1/2 rounded-thumb", t.bar)} />
            <div className="flex items-end justify-between">
              <div className={cn("h-2 w-1/3 rounded-thumb", t.bar)} />
              <div className={cn("size-8 rounded-[4px]", t.block)} />
            </div>
          </>
        )}
        {layout === "badge" && (
          <>
            <div className={cn("mx-auto mt-5 size-14 rounded-pill", t.block)} />
            <div
              className={cn("mx-auto mt-2 h-3 w-3/4 rounded-thumb", t.bar)}
            />
            <div className={cn("mx-auto h-2.5 w-1/2 rounded-thumb", t.bar)} />
            <div className={cn("mt-auto h-6 rounded-thumb", t.block)} />
          </>
        )}
      </div>
    </div>
  );
}
