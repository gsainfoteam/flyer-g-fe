import { useEffect, useRef, useState } from "react";
import {
  advanceBattle,
  applyClientMessage,
  initialBattle,
} from "@/entities/game/model/click-battle";
import { parseClientMessage } from "@/entities/game/model/messages";
import { createPlayerBinding } from "./player-binding";
import type {
  BattleClientMessage,
  BattleHostMessage,
  BattleState,
} from "@/entities/game/model/click-battle";
import { createBroadcastGameChannel } from "@/shared/lib/game-channel";
import type { GameChannel } from "@/shared/lib/game-channel";
import { createWsHostChannel } from "@/shared/lib/ws-game-channel";
import type { GameLinkStatus } from "@/shared/lib/ws-game-channel";

/**
 * TV 쪽 클릭 배틀. 상태의 원본을 들고 폰 메시지를 받아 심판한다.
 *
 * 저사양 사이니지 브라우저를 생각해 화면 갱신은 초당 5번으로 묶는다. 연타 메시지가
 * 몰려도 상태는 ref에서 바로 바뀌고, 그리기와 상태 방송만 묶어서 한다.
 */
const FRAME_MS = 200;
/** 바뀐 것이 없어도 이만큼마다 상태를 보낸다. 폰은 이 신호로 연결을 확인한다. */
const HEARTBEAT_MS = 1_000;

export interface UseBattleHostOptions {
  /**
   * 백엔드 게임 중계 주소. 있으면 실제 폰이 서버를 거쳐 붙고, 없으면 같은 브라우저
   * 탭끼리만 잇는다(개발용).
   */
  socketBase?: string | null;
  /** 이 TV(기기)의 기기 토큰. 서버 중계로 방을 열 때 필요하다. */
  token?: string | null;
  /** 테스트 주입용 */
  channel?: GameChannel<BattleClientMessage, BattleHostMessage>;
  now?: () => number;
}

export function useBattleHost(roomId: string, options: UseBattleHostOptions = {}) {
  const { channel: injected, now = Date.now, socketBase = null, token = null } = options;
  const [status, setStatus] = useState<GameLinkStatus | null>(null);
  const [state, setState] = useState<BattleState>(initialBattle);
  const stateRef = useRef<BattleState>(state);
  const [clock, setClock] = useState(() => now());

  useEffect(() => {
    // 기기 토큰이 없으면 방을 열 수 없다. 설정 링크로 다시 열어야 한다.
    if (socketBase && !token && !injected) return;

    // 폰은 자기 참가자 id를 스스로 정한다. 서버 연결 id에 묶어 남의 id를 못 쓰게 한다.
    const binding = createPlayerBinding();

    const channel =
      injected ??
      (socketBase && token
        ? createWsHostChannel<BattleClientMessage, BattleHostMessage>(socketBase, roomId, {
            token,
            onStatus: setStatus,
            // 탭을 닫은 폰은 "나간다"를 못 보낸다. 연결이 끊기면 그 연결의 참가자를 내보낸다.
            onDisconnect: (from) => {
              const playerId = binding.release(from);
              return playerId === null ? null : { kind: "leave", playerId };
            },
          })
        : createBroadcastGameChannel<BattleClientMessage, BattleHostMessage>(roomId));
    let dirty = true;
    let sentAt = 0;

    const unsubscribe = channel.subscribe((raw, from) => {
      // 폰은 로그인하지 않는다. 모양이 틀리거나 남의 참가자 id를 쓴 메시지는 버린다.
      const message = parseClientMessage(raw);
      if (!message || !binding.claim(from, message.playerId)) return;
      const result = applyClientMessage(stateRef.current, message, now());
      if (result.state !== stateRef.current) {
        stateRef.current = result.state;
        dirty = true;
      }
      if (result.reply) channel.send(result.reply);
      // 새로 연결한 폰은 다음 방송을 기다리지 않고 바로 상태를 받는다.
      if (message.kind === "hello") {
        channel.send({ kind: "state", state: stateRef.current });
      }
    });

    const timer = window.setInterval(() => {
      const at = now();
      let next = stateRef.current;
      // 탭이 오래 멈췄으면 밀린 단계를 한꺼번에 넘긴다.
      for (let step = 0; step < 4; step++) {
        const advanced = advanceBattle(next, at);
        if (advanced === next) break;
        next = advanced;
      }
      if (next !== stateRef.current) {
        stateRef.current = next;
        dirty = true;
      }
      if (dirty) setState(stateRef.current);
      if (dirty || at - sentAt >= HEARTBEAT_MS) {
        dirty = false;
        sentAt = at;
        channel.send({ kind: "state", state: stateRef.current });
      }
      setClock(at);
    }, FRAME_MS);

    return () => {
      window.clearInterval(timer);
      unsubscribe();
      if (!injected) channel.close();
    };
  }, [roomId, injected, now, socketBase, token]);

  return {
    state,
    now: clock,
    status: socketBase && !token && !injected ? ("unauthorized" as const) : status,
  };
}
