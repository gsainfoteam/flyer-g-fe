import { useCallback, useEffect, useRef, useState } from "react";
import { seatOf } from "@/entities/game/model/shuffleboard";
import type {
  JoinRejection,
  MatchClientMessage,
  MatchHostMessage,
  MatchState,
  Seat,
} from "@/entities/game/model/shuffleboard";
import { createBroadcastGameChannel } from "@/shared/lib/game-channel";
import { playerIdentityOf, signed } from "@/shared/lib/player-identity";
import { useIdlePause } from "@/shared/lib/use-idle-pause";
import type { GameChannel } from "@/shared/lib/game-channel";
import { hostTimeOf, nextClockOffset } from "@/shared/lib/host-clock";
import { createWsClientChannel } from "@/shared/lib/ws-game-channel";
import type { GameLinkStatus } from "@/shared/lib/ws-game-channel";

/**
 * 폰 쪽 셔플보드. 로그인·닉네임 없이 TV의 팀별 QR로 바로 참가한다.
 *
 * 조준은 폰에서 바로 그리고, 손을 뗄 때 각도와 힘만 한 번 보낸다. 손가락 좌표를
 * 계속 보내지 않으므로 폰↔TV 지연(약 0.8~0.9초)이 조작감에 섞이지 않는다. (명세 6장)
 */
/** TV가 이 시간 넘게 말이 없으면 연결이 끊겼다고 본다. */
const SILENCE_MS = 3_000;

/**
 * 끝난 경기의 내 결과. 방은 바로 다음 참가자를 받으므로 TV 상태에서 내가 빠져도
 * 이 폰에서는 결과 화면(설문 안내 포함)을 이어 간다.
 */
export interface FinishedMatch {
  roomId: string;
  matchId: string;
  seat: Seat;
  myScore: number;
  opponentScore: number;
  result: "WIN" | "LOSE" | "DRAW";
  finishedAt: number;
}

const finishedKey = (roomId: string) => `flyerg:shuffleboard-finished:${roomId}`;
/** 결과 화면을 닫은 경기. TV가 결과를 몇 초 더 보내는 동안 다시 뜨지 않게 한다. */
const dismissedKey = (roomId: string) => `flyerg:shuffleboard-dismissed:${roomId}`;

function readStored<T>(key: string): T | null {
  try {
    const saved = window.sessionStorage.getItem(key);
    return saved ? (JSON.parse(saved) as T) : null;
  } catch {
    return null;
  }
}

function writeStored(key: string, value: unknown) {
  try {
    if (value === null) window.sessionStorage.removeItem(key);
    else window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 저장소를 못 쓰면 이 화면에서만 기억한다.
  }
}

export interface UseShuffleboardPlayerOptions {
  socketBase?: string | null;
  /** 테스트 주입용 */
  channel?: GameChannel<MatchHostMessage, MatchClientMessage>;
}

export function useShuffleboardPlayer(roomId: string, options: UseShuffleboardPlayerOptions = {}) {
  const { channel: injected, socketBase = null } = options;
  const [link, setLink] = useState<GameLinkStatus | null>(null);
  // 이 폰의 참가자 id와 비밀 값. 같은 탭이면 새로고침해도 같다.
  const [{ id: playerId, secret }] = useState(() => playerIdentityOf(`flyerg:shuffleboard-player:${roomId}`));
  const [state, setState] = useState<MatchState | null>(null);
  const [rejection, setRejection] = useState<JoinRejection | null>(null);
  const [connected, setConnected] = useState(false);
  const [finished, setFinished] = useState<FinishedMatch | null>(() =>
    readStored<FinishedMatch>(finishedKey(roomId)),
  );
  /**
   * 이번에 보낸 발사(경기와 턴). TV가 받아 줄 때까지 같은 턴에 다시 못 쏘게 한다. 경기도
   * 함께 기억해, 다음 경기의 같은 번호 턴을 지난 발사로 막지 않는다.
   */
  const [pendingShot, setPendingShot] = useState<{ matchId: string; turn: number } | null>(null);
  const channelRef = useRef<GameChannel<MatchHostMessage, MatchClientMessage> | null>(null);
  const heardAtRef = useRef(0);
  // TV 시계 - 폰 시계. 턴·카운트다운의 끝 시각은 TV 시계라 폰은 이 차이를 더해 센다.
  const [clockOffsetMs, setClockOffsetMs] = useState(0);
  const offsetRef = useRef<number | null>(null);

  // 자리에 앉아 있지 않고 쓰지 않으면 연결을 쉰다(같은 IP 연결 수 제한).
  const { paused, resume } = useIdlePause(state ? seatOf(state, playerId) !== null : false);

  useEffect(() => {
    if (paused) return;
    const channel =
      injected ??
      (socketBase
        ? createWsClientChannel<MatchHostMessage, MatchClientMessage>(socketBase, roomId, {
            onStatus: setLink,
          })
        : createBroadcastGameChannel<MatchHostMessage, MatchClientMessage>(
            `shuffleboard:${roomId}`,
          ));
    channelRef.current = channel;

    const unsubscribe = channel.subscribe((message) => {
      heardAtRef.current = Date.now();
      setConnected(true);
      if (message.kind === "state") {
        const hostTime = hostTimeOf(message);
        if (hostTime !== null) {
          const offset = nextClockOffset(offsetRef.current, hostTime - Date.now());
          if (offset !== offsetRef.current) {
            offsetRef.current = offset;
            setClockOffsetMs(offset);
          }
        }
        const next = message.state;
        setState(next);
        const seat = seatOf(next, playerId);
        if (seat && next.phase === "FINISHED" && next.winner) {
          const other: Seat = seat === "A" ? "B" : "A";
          const record: FinishedMatch = {
            roomId,
            matchId: next.matchId,
            seat,
            myScore: next.scores[seat],
            opponentScore: next.scores[other],
            result: next.winner === "DRAW" ? "DRAW" : next.winner === seat ? "WIN" : "LOSE",
            finishedAt: Date.now(),
          };
          setFinished((current) => {
            if (current?.matchId === record.matchId) return current;
            if (readStored<string>(dismissedKey(roomId)) === record.matchId) return current;
            writeStored(finishedKey(roomId), record);
            return record;
          });
        }
      } else if (message.playerId === playerId) {
        setRejection(message.reason);
      }
    });
    channel.send(signed({ kind: "hello", playerId }, secret));

    const watch = window.setInterval(() => {
      if (Date.now() - heardAtRef.current > SILENCE_MS) setConnected(false);
    }, 1_000);

    return () => {
      window.clearInterval(watch);
      unsubscribe();
      channel.send(signed({ kind: "leave", playerId }, secret));
      if (!injected) channel.close();
      channelRef.current = null;
    };
  }, [roomId, injected, playerId, secret, socketBase, paused]);

  const join = useCallback(
    (seat: Seat | null) => {
      setRejection(null);
      channelRef.current?.send(signed({ kind: "join", playerId, seat }, secret));
    },
    [playerId, secret],
  );

  const shoot = useCallback(
    (angle: number, power: number) => {
      if (!state) return;
      setPendingShot({ matchId: state.matchId, turn: state.turn });
      channelRef.current?.send(
        signed({ kind: "shoot", playerId, turn: state.turn, angle, power }, secret),
      );
    },
    [playerId, secret, state],
  );

  /** 결과 화면을 닫고 다음 경기에 참가할 수 있게 한다. */
  const dismissFinished = useCallback(() => {
    const current = readStored<FinishedMatch>(finishedKey(roomId));
    if (current) writeStored(dismissedKey(roomId), current.matchId);
    writeStored(finishedKey(roomId), null);
    setFinished(null);
  }, [roomId]);

  const mySeat = state ? seatOf(state, playerId) : null;
  const waitingForTv =
    pendingShot !== null &&
    state?.matchId === pendingShot.matchId &&
    state.turn === pendingShot.turn &&
    state.rollingUntil === null;

  return {
    playerId,
    state,
    mySeat,
    rejection,
    connected: connected && !paused,
    /** 쓰지 않아 연결을 쉬는 중. `resume`으로 다시 붙는다. */
    paused,
    resume,
    link,
    /** TV 시계 - 폰 시계(ms). 화면은 `useHostNow`로 TV 시계에 맞춰 센다. */
    clockOffsetMs,
    finished,
    /** 보낸 발사를 TV가 아직 받지 않았다(지연 중) */
    waitingForTv,
    join,
    shoot,
    dismissFinished,
  };
}
