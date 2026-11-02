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

function randomId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** 같은 탭에서는 같은 참가자다. 새로고침해도 하던 판으로 돌아온다. */
function playerIdOf(roomId: string): string {
  const key = `flyerg:dodge-player:${roomId}`;
  try {
    const saved = window.sessionStorage.getItem(key);
    if (saved) return saved;
    const created = randomId();
    window.sessionStorage.setItem(key, created);
    return created;
  } catch {
    return randomId();
  }
}

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
  const [playerId] = useState(() => playerIdOf(roomId));
  const [view, setView] = useState<DodgeView | null>(null);
  const [rejection, setRejection] = useState<DodgeRejection | null>(null);
  const [connected, setConnected] = useState(false);
  const [myResult, setMyResult] = useState<MyDodgeResult | null>(null);
  const [clockOffsetMs, setClockOffsetMs] = useState(0);
  const offsetRef = useRef<number | null>(null);
  const channelRef = useRef<GameChannel<DodgeHostMessage, DodgeClientMessage> | null>(null);
  const heardAtRef = useRef(0);
  const directionRef = useRef<Direction>(0);
  const sentRef = useRef<{ direction: Direction; at: number }>({ direction: 0, at: 0 });

  useEffect(() => {
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
        if (next.phase === "RESULT" && next.result && next.player?.id === playerId) {
          const result = { ...next.result, round: next.round, rank: next.rank };
          setMyResult((current) =>
            current?.round === result.round && current.rank === result.rank ? current : result,
          );
        }
      } else if (message.playerId === playerId) {
        setRejection(message.reason);
      }
    });
    channel.send({ kind: "hello", playerId });

    const tick = window.setInterval(() => {
      const at = Date.now();
      const direction = directionRef.current;
      const sent = sentRef.current;
      // 누르고 있으면 되풀이하고, 바뀌었는데 간격 때문에 못 보낸 방향은 이제 보낸다.
      const due =
        (direction !== 0 && at - sent.at >= REPEAT_MS) ||
        (direction !== sent.direction && at - sent.at >= MIN_GAP_MS);
      if (due) {
        channel.send({ kind: "move", playerId, direction });
        sentRef.current = { direction, at };
      }
      if (at - heardAtRef.current > SILENCE_MS) setConnected(false);
    }, 50);

    return () => {
      window.clearInterval(tick);
      unsubscribe();
      channel.send({ kind: "leave", playerId });
      if (!injected) channel.close();
      channelRef.current = null;
    };
  }, [roomId, injected, playerId, socketBase]);

  const join = useCallback(
    (name: string, ticket: string) => {
      setRejection(null);
      setMyResult(null);
      channelRef.current?.send({ kind: "join", playerId, name, ticket });
    },
    [playerId],
  );

  /** 버튼을 누르거나 뗄 때. 간격이 허락하면 바로 보낸다. */
  const steer = useCallback(
    (direction: Direction) => {
      directionRef.current = direction;
      const at = Date.now();
      if (direction !== sentRef.current.direction && at - sentRef.current.at >= MIN_GAP_MS) {
        channelRef.current?.send({ kind: "move", playerId, direction });
        sentRef.current = { direction, at };
      }
    },
    [playerId],
  );

  const dismissResult = useCallback(() => setMyResult(null), []);

  return {
    playerId,
    view,
    /** 이 판의 참가자가 나인가 */
    isMe: view?.player?.id === playerId,
    rejection,
    connected,
    link,
    /** TV 시계 - 폰 시계(ms). 화면은 `useHostNow`로 TV 시계에 맞춰 센다. */
    clockOffsetMs,
    myResult,
    join,
    steer,
    dismissResult,
  };
}
