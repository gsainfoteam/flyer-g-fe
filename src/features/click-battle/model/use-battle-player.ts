import { useCallback, useEffect, useRef, useState } from "react";
import type {
  BattleClientMessage,
  BattleHostMessage,
  BattleState,
  JoinRejection,
  Team,
} from "@/entities/game/model/click-battle";
import { createBroadcastGameChannel } from "@/shared/lib/game-channel";
import { playerIdentityOf, signed } from "@/shared/lib/player-identity";
import { useIdlePause } from "@/shared/lib/use-idle-pause";
import type { GameChannel } from "@/shared/lib/game-channel";
import { hostTimeOf, nextClockOffset } from "@/shared/lib/host-clock";
import { createWsClientChannel } from "@/shared/lib/ws-game-channel";
import type { GameLinkStatus } from "@/shared/lib/ws-game-channel";

/**
 * 폰 쪽 클릭 배틀. 로그인 없이 이름만 받아 참가한다.
 *
 * 누를 때마다 보내지 않고 짧게 모아서 보낸다. 메시지 수를 줄이고, 점수는 TV가 받아
 * 준 만큼만 오른다. 화면의 "내가 누른 수"는 바로 반응하도록 폰에서 센다.
 */
const FLUSH_MS = 150;
/** TV가 이 시간 넘게 말이 없으면 연결이 끊겼다고 본다. */
const SILENCE_MS = 3_000;

export interface UseBattlePlayerOptions {
  /** 백엔드 게임 중계 주소. 없으면 같은 브라우저 탭끼리 잇는다(개발용). */
  socketBase?: string | null;
  /** 테스트 주입용 */
  channel?: GameChannel<BattleHostMessage, BattleClientMessage>;
}

export function useBattlePlayer(roomId: string, options: UseBattlePlayerOptions = {}) {
  const { channel: injected, socketBase = null } = options;
  const [link, setLink] = useState<GameLinkStatus | null>(null);
  // 이 폰의 참가자 id와 비밀 값. 같은 탭이면 새로고침해도 같다.
  const [{ id: playerId, secret }] = useState(() => playerIdentityOf(`flyerg:battle-player:${roomId}`));
  const [state, setState] = useState<BattleState | null>(null);
  const [rejection, setRejection] = useState<JoinRejection | null>(null);
  const [connected, setConnected] = useState(false);
  const [localTaps, setLocalTaps] = useState(0);
  const [clockOffsetMs, setClockOffsetMs] = useState(0);
  const offsetRef = useRef<number | null>(null);
  const stateRef = useRef<BattleState | null>(null);
  const channelRef = useRef<GameChannel<BattleHostMessage, BattleClientMessage> | null>(null);
  const pendingRef = useRef(0);
  const heardAtRef = useRef(0);
  // 판에 들어와 있지 않고 쓰지 않으면 연결을 쉰다(같은 IP 연결 수 제한).
  const participating = state?.players.some((player) => player.id === playerId) ?? false;
  const { paused, resume } = useIdlePause(participating);

  useEffect(() => {
    if (paused) return;
    const channel =
      injected ??
      (socketBase
        ? createWsClientChannel<BattleHostMessage, BattleClientMessage>(socketBase, roomId, {
            onStatus: setLink,
          })
        : createBroadcastGameChannel<BattleHostMessage, BattleClientMessage>(roomId));
    channelRef.current = channel;

    const unsubscribe = channel.subscribe((message) => {
      heardAtRef.current = Date.now();
      setConnected(true);
      if (message.kind === "state") {
        const hostTime = hostTimeOf(message);
        if (hostTime !== null) {
          const next = nextClockOffset(offsetRef.current, hostTime - Date.now());
          if (next !== offsetRef.current) {
            offsetRef.current = next;
            setClockOffsetMs(next);
          }
        }
        stateRef.current = message.state;
        setState(message.state);
        // 판이 끝나 내가 명단에서 빠지면 다음 판을 위해 내 수를 비운다.
        if (!message.state.players.some((player) => player.id === playerId)) {
          setLocalTaps(0);
        }
      } else if (message.playerId === playerId) {
        setRejection(message.reason);
      }
    });
    channel.send(signed({ kind: "hello", playerId }, secret));

    const flush = window.setInterval(() => {
      if (pendingRef.current > 0) {
        channel.send(signed({ kind: "taps", playerId, count: pendingRef.current }, secret));
        pendingRef.current = 0;
      }
      if (Date.now() - heardAtRef.current > SILENCE_MS) setConnected(false);
    }, FLUSH_MS);

    return () => {
      window.clearInterval(flush);
      unsubscribe();
      channel.send(signed({ kind: "leave", playerId }, secret));
      if (!injected) channel.close();
      channelRef.current = null;
    };
  }, [roomId, injected, playerId, secret, socketBase, paused]);

  const join = useCallback(
    (name: string, team: Team) => {
      setRejection(null);
      channelRef.current?.send(signed({ kind: "join", playerId, name, team }, secret));
    },
    [playerId, secret],
  );

  // 경기가 끝난 뒤(TV 시계 기준) 누른 수는 TV가 받지 않는다. 화면의 수도 멈춰 둘이 맞게 한다.
  // TV 시각을 아직 모르면(시각을 보내지 않는 옛 TV) 폰 시계로는 끝을 판단하지 않는다.
  // 두 시계가 다르면 경기 중 연타를 버리게 된다. 그때는 결과 화면이 올 때 멈춘다.
  const tap = useCallback(() => {
    const current = stateRef.current;
    if (current?.phase !== "PLAYING") return;
    const offset = offsetRef.current;
    if (offset !== null && current.phaseEndsAt !== null && Date.now() + offset >= current.phaseEndsAt) {
      return;
    }
    pendingRef.current += 1;
    setLocalTaps((count) => count + 1);
  }, []);

  const me = state?.players.find((player) => player.id === playerId) ?? null;

  return {
    playerId,
    state,
    me,
    rejection,
    connected: connected && !paused,
    /** 쓰지 않아 연결을 쉬는 중. `resume`으로 다시 붙는다. */
    paused,
    resume,
    link,
    localTaps,
    clockOffsetMs,
    join,
    tap,
  };
}
