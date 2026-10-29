import { useCallback, useEffect, useRef, useState } from "react";
import type {
  BattleClientMessage,
  BattleHostMessage,
  BattleState,
  JoinRejection,
  Team,
} from "@/entities/game/model/click-battle";
import { createBroadcastGameChannel } from "@/shared/lib/game-channel";
import type { GameChannel } from "@/shared/lib/game-channel";
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

/**
 * `crypto.randomUUID`는 https나 localhost에서만 있다. 개발 중 폰이 LAN 주소(http)로
 * 들어오면 없으므로 대신 만든다. 식별용일 뿐 보안 값이 아니다.
 */
function randomId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function playerIdOf(roomId: string): string {
  const key = `flyerg:battle-player:${roomId}`;
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

export interface UseBattlePlayerOptions {
  /** 백엔드 게임 중계 주소. 없으면 같은 브라우저 탭끼리 잇는다(개발용). */
  socketBase?: string | null;
  /** 테스트 주입용 */
  channel?: GameChannel<BattleHostMessage, BattleClientMessage>;
}

export function useBattlePlayer(roomId: string, options: UseBattlePlayerOptions = {}) {
  const { channel: injected, socketBase = null } = options;
  const [link, setLink] = useState<GameLinkStatus | null>(null);
  const [playerId] = useState(() => playerIdOf(roomId));
  const [state, setState] = useState<BattleState | null>(null);
  const [rejection, setRejection] = useState<JoinRejection | null>(null);
  const [connected, setConnected] = useState(false);
  const [localTaps, setLocalTaps] = useState(0);
  const channelRef = useRef<GameChannel<BattleHostMessage, BattleClientMessage> | null>(null);
  const pendingRef = useRef(0);
  const heardAtRef = useRef(0);

  useEffect(() => {
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
        setState(message.state);
        // 판이 끝나 내가 명단에서 빠지면 다음 판을 위해 내 수를 비운다.
        if (!message.state.players.some((player) => player.id === playerId)) {
          setLocalTaps(0);
        }
      } else if (message.playerId === playerId) {
        setRejection(message.reason);
      }
    });
    channel.send({ kind: "hello", playerId });

    const flush = window.setInterval(() => {
      if (pendingRef.current > 0) {
        channel.send({ kind: "taps", playerId, count: pendingRef.current });
        pendingRef.current = 0;
      }
      if (Date.now() - heardAtRef.current > SILENCE_MS) setConnected(false);
    }, FLUSH_MS);

    return () => {
      window.clearInterval(flush);
      unsubscribe();
      channel.send({ kind: "leave", playerId });
      if (!injected) channel.close();
      channelRef.current = null;
    };
  }, [roomId, injected, playerId, socketBase]);

  const join = useCallback(
    (name: string, team: Team) => {
      setRejection(null);
      channelRef.current?.send({ kind: "join", playerId, name, team });
    },
    [playerId],
  );

  const tap = useCallback(() => {
    pendingRef.current += 1;
    setLocalTaps((count) => count + 1);
  }, []);

  const me = state?.players.find((player) => player.id === playerId) ?? null;

  return { playerId, state, me, rejection, connected, link, localTaps, join, tap };
}
