import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight, Heart } from "lucide-react";
import { useParams, useSearchParams } from "react-router";
import { DODGE_RULES, dodgeSecondsLeft } from "@/entities/game/model/flyer-dodge";
import type { Direction } from "@/entities/game/model/flyer-dodge";
import { readWebUrl } from "@/entities/widget/model/data-content";
import { SURVEY_URL } from "@/entities/widget/model/operation";
import { useDodgePlayer } from "@/features/flyer-dodge/model/use-dodge-player";
import type { MyDodgeResult } from "@/features/flyer-dodge/model/use-dodge-player";
import { gameSocketBase } from "@/shared/lib/game-socket";
import { useHostNow } from "@/shared/lib/host-clock";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";

/**
 * 전단지 피하기 참가 (폰). TV의 QR로 로그인 없이 들어와 이름만 적는다.
 *
 * 플레이 중에는 화면 대부분을 좌우 버튼 두 개로 쓴다. 누르고 있는 동안 로고가 움직이고
 * 떼면 멈춘다. 폰에는 판이 없다(TV를 보고 피한다). 남은 초는 TV 시계로 센다.
 */
const SURVEY = readWebUrl(SURVEY_URL);

export function FlyerDodgePlayPage() {
  const { roomId = "lobby" } = useParams();
  const [searchParams] = useSearchParams();
  const ticket = searchParams.get("t") ?? "";
  const player = useDodgePlayer(roomId, { socketBase: gameSocketBase() });
  const now = useHostNow(player.clockOffsetMs);
  const [name, setName] = useState("");
  const { view } = player;

  if (player.myResult) {
    return <ResultView result={player.myResult} onClose={player.dismissResult} />;
  }

  if (!player.connected || !view) {
    return (
      <Notice
        title={player.link === "waiting-host" ? "TV가 아직 게임을 열지 않았어요" : "TV에 연결하는 중이에요"}
        description={
          player.link === "waiting-host"
            ? "TV에 전단지 피하기 화면이 켜지면 바로 이어져요. 이 화면을 열어 두세요."
            : "인터넷 연결을 확인해 주세요. 계속 안 되면 TV 화면의 QR을 다시 찍어 보세요."
        }
      />
    );
  }

  if (!player.isMe) {
    if (view.phase !== "LOBBY") {
      return (
        <Notice
          title="지금 다른 사람이 하는 중이에요"
          description={`${view.player?.name ?? ""} 님이 끝나면 TV에 새 QR이 떠요. 그 QR을 찍어 주세요.`}
        />
      );
    }
    return (
      <form
        className="flex flex-1 flex-col gap-6 pt-4"
        onSubmit={(event) => {
          event.preventDefault();
          player.join(name, ticket);
        }}
      >
        <div>
          <p className="text-label font-bold text-accent">게임</p>
          <h1 className="mt-2 text-title text-ink">전단지 피하기</h1>
          <p className="mt-2 text-body text-ink-muted">
            버튼을 누르고 있으면 TV의 로고가 움직여요. {DODGE_RULES.durationMs / 1_000}초 동안
            떨어지는 전단지를 피하세요. 로그인 없이 이름만 적어요.
          </p>
        </div>
        <Input
          aria-label="이름"
          value={name}
          maxLength={DODGE_RULES.nameMaxLength}
          placeholder="예: 3층 하윤 (TV에 보여요)"
          onChange={(event) => setName(event.target.value)}
          className="h-12 text-subhead"
        />
        {(player.rejection || !ticket) && (
          <p role="alert" className="text-label text-danger">
            {player.rejection === "BUSY"
              ? "방금 다른 사람이 먼저 시작했어요. 끝나면 TV에 뜨는 새 QR을 찍어 주세요."
              : "TV에 지금 떠 있는 QR을 다시 찍어 주세요."}
          </p>
        )}
        <Button type="submit" size="lg" className="mt-auto h-14 text-subhead" disabled={!ticket}>
          시작하기
        </Button>
      </form>
    );
  }

  const seconds = dodgeSecondsLeft(view.phaseEndsAt, now) ?? 0;
  const me = view.player!;
  return (
    <div className="flex flex-1 flex-col gap-4 pt-2">
      <div className="flex items-center justify-between rounded-card bg-surface px-5 py-3">
        <div className="flex items-center gap-1" aria-label={`하트 ${me.lives}개`}>
          {Array.from({ length: DODGE_RULES.lives }, (_, index) => (
            <Heart
              key={index}
              aria-hidden="true"
              className={cn("size-6", index < me.lives ? "fill-danger text-danger" : "text-ink-subtle")}
            />
          ))}
        </div>
        <p className="text-subhead font-extrabold text-ink tabular-nums">
          {me.score.toLocaleString("ko-KR")}점
        </p>
        <p className="text-title text-ink tabular-nums">{seconds}초</p>
      </div>
      {view.phase === "COUNTDOWN" && (
        <p className="text-center text-title text-ink">{seconds}초 뒤 시작해요 · TV를 보세요</p>
      )}
      <Controls onSteer={player.steer} disabled={view.phase !== "PLAYING"} />
    </div>
  );
}

/**
 * 좌우 버튼. 손가락이 닿는 순간 움직이고 떼면 멈춘다. 손가락이 버튼 밖으로 나가거나
 * 화면이 가려져도 멈춘다. 키보드 화살표도 된다(개발·시험용).
 */
function Controls({ onSteer, disabled }: { onSteer: (direction: Direction) => void; disabled: boolean }) {
  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") onSteer(-1);
      if (event.key === "ArrowRight") onSteer(1);
    };
    const up = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") onSteer(0);
    };
    const stop = () => onSteer(0);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    document.addEventListener("visibilitychange", stop);
    window.addEventListener("blur", stop);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      document.removeEventListener("visibilitychange", stop);
      window.removeEventListener("blur", stop);
      onSteer(0);
    };
  }, [onSteer]);

  const button = (direction: Direction, label: string, icon: ReactNode) => (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onPointerDown={(event) => {
        event.preventDefault();
        event.currentTarget.setPointerCapture?.(event.pointerId);
        onSteer(direction);
      }}
      onPointerUp={() => onSteer(0)}
      onPointerCancel={() => onSteer(0)}
      onLostPointerCapture={() => onSteer(0)}
      onContextMenu={(event) => event.preventDefault()}
      className="flex flex-1 touch-none items-center justify-center rounded-card bg-accent text-accent-on select-none active:bg-accent-700 disabled:opacity-40"
    >
      {icon}
    </button>
  );

  return (
    <div className="grid flex-1 grid-cols-2 gap-3">
      {button(-1, "왼쪽", <ChevronLeft aria-hidden="true" className="size-24" />)}
      {button(1, "오른쪽", <ChevronRight aria-hidden="true" className="size-24" />)}
    </div>
  );
}

function ResultView({ result, onClose }: { result: MyDodgeResult; onClose: () => void }) {
  return (
    <div className="flex flex-1 flex-col gap-6 pt-6">
      <div className="text-center">
        <p className="text-label font-bold text-accent">전단지 피하기</p>
        <p className="mt-3 text-[56px] leading-none font-extrabold text-ink tabular-nums">
          {result.score.toLocaleString("ko-KR")}점
        </p>
        <p className="mt-3 text-body text-ink-muted">
          {(result.survivedMs / 1_000).toFixed(1)}초 버텼어요 ·{" "}
          {result.rank ? `이 TV ${result.rank}위!` : "이 TV 5위 밖"}
        </p>
      </div>
      {SURVEY && (
        <div className="rounded-card bg-surface px-5 py-4">
          <p className="text-subhead font-bold text-ink">전단지 설문에 참여해 주세요</p>
          <p className="mt-1 text-label text-ink-muted">로비 TV 게시판을 써 본 느낌을 들려주세요. 1분이면 끝나요.</p>
        </div>
      )}
      <div className="mt-auto flex flex-col gap-3">
        {SURVEY && (
          <Button asChild size="lg" className="h-14 text-subhead">
            <a href={SURVEY} target="_blank" rel="noreferrer">
              설문 참여하기
            </a>
          </Button>
        )}
        <Button variant="outline" size="lg" className="h-14 text-subhead" onClick={onClose}>
          닫기
        </Button>
        <p className="text-center text-label text-ink-subtle">다시 하려면 TV에 새로 뜬 QR을 찍어 주세요.</p>
      </div>
    </div>
  );
}

function Notice({ title, description }: { title: string; description: string }) {
  return (
    <div role="status" className="flex flex-1 flex-col justify-center gap-4 text-center">
      <h1 className="text-title text-ink">{title}</h1>
      <p className="text-body text-ink-muted">{description}</p>
    </div>
  );
}
