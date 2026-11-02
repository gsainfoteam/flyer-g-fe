import type { ReactNode } from "react";
import { Heart } from "lucide-react";
import type { DodgeRecord } from "@/entities/game/model/dodge-ranking";
import { RANKING_SIZE } from "@/entities/game/model/dodge-ranking";
import {
  DODGE_RULES,
  dodgeScore,
  dodgeSecondsLeft,
} from "@/entities/game/model/flyer-dodge";
import type { DodgeState } from "@/entities/game/model/flyer-dodge";
import { QRCodeBox } from "@/shared/components/QRCodeBox";
import { SurveyCorner } from "@/shared/components/SurveyCorner";
import type { EventSurvey } from "@/shared/components/SurveyCorner";
import { cn } from "@/shared/lib/utils";
import { DodgeField } from "./DodgeField";

/**
 * 전단지 피하기 TV 화면의 본문. 단독 게임 화면과 플레이어의 게임 위젯이 함께 쓴다.
 *
 * 모집 중에는 QR과 이 TV의 순위가 주인공이고, 플레이 중에는 판이 화면 대부분을 쓴다.
 * 지나가는 사람이 무슨 게임인지 바로 알게 제목에 게임 이름과 할 일을 쓴다.
 * 1920x1080 기준 px이고, 축소는 감싸는 쪽이 한다.
 */
interface DodgeStageProps {
  state: DodgeState;
  /** 캔버스가 매 프레임 읽는 원본 */
  readState: () => DodgeState;
  now: number;
  /** 참가 QR 주소. 연결 준비 전이거나 누가 하는 중이면 null */
  joinUrl: string | null;
  /** QR을 띄울 수 없을 때 그 자리에 적을 말 */
  closedLabel: string;
  ranking: readonly DodgeRecord[];
  /** 방금 끝난 판의 이 TV 순위 */
  rank: number | null;
  /** 행사 시간대 화면에만 붙이는 설문 QR */
  survey: EventSurvey | null;
  /** 맨 위 머리 줄. 화면마다 다르다. */
  header: ReactNode;
}

function statusOf(state: DodgeState, now: number, rank: number | null): { title: string; detail: string } {
  const seconds = dodgeSecondsLeft(state.phaseEndsAt, now) ?? 0;
  const name = state.player?.name ?? "";
  switch (state.phase) {
    case "LOBBY":
      return {
        title: "전단지 피하기",
        detail: `폰 버튼으로 로고를 움직여 떨어지는 전단지를 피해요 · ${DODGE_RULES.durationMs / 1_000}초, 하트 ${DODGE_RULES.lives}개`,
      };
    case "COUNTDOWN":
      return { title: `${seconds}초 뒤 시작`, detail: `${name} 님, 폰의 좌우 버튼을 준비하세요` };
    case "PLAYING":
      return { title: `${seconds}초`, detail: `${name} 님이 피하는 중` };
    case "RESULT":
      return {
        title: `${state.result?.score.toLocaleString("ko-KR") ?? 0}점`,
        detail: rank ? `${name} 님, 이 TV ${rank}위!` : `${name} 님, 수고했어요`,
      };
  }
}

export function DodgeStage({
  state,
  readState,
  now,
  joinUrl,
  closedLabel,
  ranking,
  rank,
  survey,
  header,
}: DodgeStageProps) {
  const status = statusOf(state, now, rank);
  const inRun = state.phase === "COUNTDOWN" || state.phase === "PLAYING";

  return (
    <div className="flex h-full flex-col gap-8">
      {header}

      <div className="flex shrink-0 items-end gap-10">
        <div className="min-w-0 flex-1">
          <h1
            className={cn(
              "text-[88px] leading-none font-extrabold tracking-tight tabular-nums",
              state.phase === "RESULT" ? "text-accent" : "text-ink",
            )}
          >
            {status.title}
          </h1>
          <p className="mt-4 truncate text-[34px] text-ink-muted">{status.detail}</p>
        </div>
        {inRun && state.player && <RunStats state={state} now={now} />}
        {survey && <SurveyCorner survey={survey} finished={state.phase === "RESULT"} />}
      </div>

      {inRun ? (
        <div className="relative min-h-0 flex-1">
          <DodgeField readState={readState} />
          {state.phase === "COUNTDOWN" && (
            <p className="absolute inset-0 grid place-items-center text-[240px] font-extrabold text-ink tabular-nums">
              {dodgeSecondsLeft(state.phaseEndsAt, now)}
            </p>
          )}
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-[1fr_640px] gap-8">
          {state.phase === "RESULT" ? (
            <ResultPanel state={state} rank={rank} />
          ) : (
            <JoinPanel joinUrl={joinUrl} closedLabel={closedLabel} />
          )}
          <RankingPanel ranking={ranking} highlight={state.phase === "RESULT" ? rank : null} />
        </div>
      )}
    </div>
  );
}

function RunStats({ state, now }: { state: DodgeState; now: number }) {
  const player = state.player!;
  const score = state.phase === "PLAYING" ? dodgeScore(player, now - state.startedAt!) : 0;
  return (
    <div className="flex shrink-0 items-center gap-10 rounded-tv-card bg-surface px-10 py-6">
      <div className="flex items-center gap-2" aria-label={`하트 ${player.lives}개`}>
        {Array.from({ length: DODGE_RULES.lives }, (_, index) => (
          <Heart
            key={index}
            aria-hidden="true"
            className={cn(
              "size-14",
              index < player.lives ? "fill-danger text-danger" : "text-ink-subtle",
            )}
          />
        ))}
      </div>
      <p className="text-[64px] leading-none font-extrabold text-ink tabular-nums">
        {score.toLocaleString("ko-KR")}
        <span className="ml-2 text-[30px] text-ink-muted">점</span>
      </p>
    </div>
  );
}

function JoinPanel({ joinUrl, closedLabel }: { joinUrl: string | null; closedLabel: string }) {
  return (
    <section className="flex min-h-0 items-center gap-16 rounded-tv-card bg-surface px-16 py-12">
      <div className="flex shrink-0 flex-col items-center gap-5">
        {joinUrl ? (
          <>
            <QRCodeBox value={joinUrl} size="tv" />
            <p className="text-[38px] font-extrabold text-accent">QR로 참가</p>
          </>
        ) : (
          <p className="w-[240px] text-center text-[28px] leading-snug whitespace-pre-line text-ink-subtle">
            {closedLabel}
          </p>
        )}
      </div>
      <ol className="flex min-w-0 flex-col gap-6 text-[36px] leading-snug text-ink">
        <li>
          <span className="font-extrabold text-accent">1</span> QR을 찍고 이름을 적어요
        </li>
        <li>
          <span className="font-extrabold text-accent">2</span> 폰의 ◀ ▶ 버튼을 누르고 있으면 로고가 움직여요
        </li>
        <li>
          <span className="font-extrabold text-accent">3</span> 전단지는 피하고, 노란 ＋와 하트는 받아요
        </li>
      </ol>
    </section>
  );
}

function ResultPanel({ state, rank }: { state: DodgeState; rank: number | null }) {
  const result = state.result;
  return (
    <section className="flex min-h-0 flex-col justify-center gap-6 rounded-tv-card bg-surface px-16 py-12">
      <p className="text-[40px] font-extrabold text-ink">{result?.name}</p>
      <p className="text-[160px] leading-none font-extrabold tracking-tight text-accent tabular-nums">
        {result?.score.toLocaleString("ko-KR")}
      </p>
      <p className="text-[34px] text-ink-muted">
        {((result?.survivedMs ?? 0) / 1_000).toFixed(1)}초 버텼어요 ·{" "}
        {rank ? `이 TV ${rank}위` : `이 TV ${RANKING_SIZE}위 밖`}
      </p>
    </section>
  );
}

function RankingPanel({
  ranking,
  highlight,
}: {
  ranking: readonly DodgeRecord[];
  highlight: number | null;
}) {
  return (
    <section aria-label="이 TV 순위" className="flex min-h-0 flex-col gap-5 rounded-tv-card bg-surface px-12 py-10">
      <h2 className="text-[34px] font-extrabold text-ink">이 TV 순위</h2>
      {ranking.length === 0 ? (
        <p className="text-[30px] text-ink-subtle">아직 기록이 없어요. 첫 기록을 남겨 보세요!</p>
      ) : (
        <ol className="flex flex-col gap-3">
          {ranking.map((record, index) => (
            <li
              key={`${record.at}-${record.name}`}
              className={cn(
                "flex items-baseline gap-5 rounded-tv-poster px-5 py-3 text-[34px]",
                highlight === index + 1 ? "bg-accent text-accent-on" : "text-ink",
              )}
            >
              <span className="w-10 font-extrabold tabular-nums">{index + 1}</span>
              <span className="min-w-0 flex-1 truncate font-bold">{record.name}</span>
              <span className="font-extrabold tabular-nums">{record.score.toLocaleString("ko-KR")}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

