import { useCallback, useEffect, useRef, useState } from "react";
import type {
  DodgeClientMessage,
  DodgeHostMessage,
  DodgeRejection,
  DodgeResult,
  DodgeView,
  Direction,
} from "@/entities/game/model/flyer-dodge";
import { createBroadcastGameChannel } from "@/shared/lib/game-channel";
import { playerIdentityOf, signed } from "@/shared/lib/player-identity";
import { useIdlePause } from "@/shared/lib/use-idle-pause";
import type { GameChannel } from "@/shared/lib/game-channel";
import { hostTimeOf, nextClockOffset } from "@/shared/lib/host-clock";
import { createWsClientChannel } from "@/shared/lib/ws-game-channel";
import type { GameLinkStatus } from "@/shared/lib/ws-game-channel";

/**
 * 폰 쪽 전단지 피하기. 이름만 받아 참가하고, 좌우 버튼을 누르는 동안 방향을 보낸다.
 *
 * TV는 600ms 넘게 말이 없으면 멈추므로 누르고 있는 동안 250ms마다 같은 방향을 다시
 * 보낸다(손 뗌 메시지가 유실돼도 멈춘다). 방향이 바뀌면 바로 보내되, 연타로 백엔드 중계의
 * 빈도 한도(초당 20번)를 넘지 않게 80ms 간격을 둔다.
 */
const REPEAT_MS = 250;
const MIN_GAP_MS = 80;
/** TV가 이 시간 넘게 말이 없으면 연결이 끊겼다고 본다. */
const SILENCE_MS = 3_000;

export interface UseDodgePlayerOptions {
  /** 백엔드 게임 중계 주소. 없으면 같은 브라우저 탭끼리 잇는다(개발용). */
  socketBase?: string | null;
  /** 테스트 주입용 */
  channel?: GameChannel<DodgeHostMessage, DodgeClientMessage>;
}

/** 내가 한 판의 결과. TV가 다음 모집으로 넘어가도 폰에는 남겨 둔다. */
export interface MyDodgeResult extends DodgeResult {
  round: number;
  rank: number | null;
}

export function useDodgePlayer(roomId: string, options: UseDodgePlayerOptions = {}) {
  const { channel: injected, socketBase = null } = options;
  const [link, setLink] = useState<GameLinkStatus | null>(null);
  // 이 폰의 참가자 id와 비밀 값. 같은 탭이면 새로고침해도 같다.
  const [{ id: playerId, secret }] = useState(() => playerIdentityOf(`flyerg:dodge-player:${roomId}`));
  const [view, setView] = useState<DodgeView | null>(null);
  const [rejection, setRejection] = useState<DodgeRejection | null>(null);
  const [connected, setConnected] = useState(false);
  const [myResult, setMyResult] = useState<MyDodgeResult | null>(null);
  /** 결과 화면을 닫은 판. TV가 결과를 몇 초 더 보내는 동안 다시 뜨지 않게 한다. */
  const dismissedRoundRef = useRef<number | null>(null);
  const [clockOffsetMs, setClockOffsetMs] = useState(0);
  const offsetRef = useRef<number | null>(null);
  const channelRef = useRef<GameChannel<DodgeHostMessage, DodgeClientMessage> | null>(null);
  const heardAtRef = useRef(0);
  const directionRef = useRef<Direction>(0);
  const sentRef = useRef<{ direction: Direction; at: number }>({ direction: 0, at: 0 });

  // 내 판이 아니고 쓰지 않으면 연결을 쉰다(같은 IP 연결 수 제한).
  const { paused, resume } = useIdlePause(
    view?.player?.id === playerId && view.phase !== "LOBBY",
  );

  useEffect(() => {
    if (paused) return;
    const channel =
      injected ??
      (socketBase
        ? createWsClientChannel<DodgeHostMessage, DodgeClientMessage>(socketBase, roomId, {
            onStatus: setLink,
          })
        : createBroadcastGameChannel<DodgeHostMessage, DodgeClientMessage>(`flyer-dodge:${roomId}`));
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
        const next = message.view;
        setView(next);
        if (
          next.phase === "RESULT" &&
          next.result &&
          next.player?.id === playerId &&
          dismissedRoundRef.current !== next.round
        ) {
          const result = { ...next.result, round: next.round, rank: next.rank };
          setMyResult((current) =>
            current?.round === result.round && current.rank === result.rank ? current : result,
          );
        }
      } else if (message.playerId === playerId) {
        setRejection(message.reason);
      }
    });
    channel.send(signed({ kind: "hello", playerId }, secret));

    const tick = window.setInterval(() => {
      const at = Date.now();
      const direction = directionRef.current;
      const sent = sentRef.current;
      // 누르고 있으면 되풀이하고, 바뀌었는데 간격 때문에 못 보낸 방향은 이제 보낸다.
      const due =
        (direction !== 0 && at - sent.at >= REPEAT_MS) ||
        (direction !== sent.direction && at - sent.at >= MIN_GAP_MS);
      if (due) {
        channel.send(signed({ kind: "move", playerId, direction }, secret));
        sentRef.current = { direction, at };
      }
      if (at - heardAtRef.current > SILENCE_MS) setConnected(false);
    }, 50);

    return () => {
      window.clearInterval(tick);
      unsubscribe();
      channel.send(signed({ kind: "leave", playerId }, secret));
      if (!injected) channel.close();
      channelRef.current = null;
    };
  }, [roomId, injected, playerId, secret, socketBase, paused]);

  const join = useCallback(
    (name: string, ticket: string) => {
      setRejection(null);
      setMyResult(null);
      channelRef.current?.send(signed({ kind: "join", playerId, name, ticket }, secret));
    },
    [playerId, secret],
  );

  /** 버튼을 누르거나 뗄 때. 간격이 허락하면 바로 보낸다. */
  const steer = useCallback(
    (direction: Direction) => {
      directionRef.current = direction;
      const at = Date.now();
      if (direction !== sentRef.current.direction && at - sentRef.current.at >= MIN_GAP_MS) {
        channelRef.current?.send(signed({ kind: "move", playerId, direction }, secret));
        sentRef.current = { direction, at };
      }
    },
    [playerId, secret],
  );

  const dismissResult = useCallback(() => {
    setMyResult((current) => {
      if (current) dismissedRoundRef.current = current.round;
      return null;
    });
  }, []);

  return {
    playerId,
    view,
    /** 이 판의 참가자가 나인가 */
    isMe: view?.player?.id === playerId,
    rejection,
    connected: connected && !paused,
    /** 쓰지 않아 연결을 쉬는 중. `resume`으로 다시 붙는다. */
    paused,
    resume,
    link,
    /** TV 시계 - 폰 시계(ms). 화면은 `useHostNow`로 TV 시계에 맞춰 센다. */
    clockOffsetMs,
    myResult,
    join,
    steer,
    dismissResult,
  };
}
