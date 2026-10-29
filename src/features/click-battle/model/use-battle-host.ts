import { useEffect, useRef, useState } from "react";
import {
  advanceBattle,
  applyClientMessage,
  initialBattle,
} from "@/entities/game/model/click-battle";
import type {
  BattleClientMessage,
  BattleHostMessage,
  BattleState,
} from "@/entities/game/model/click-battle";
import { createBroadcastGameChannel } from "@/shared/lib/game-channel";
import type { GameChannel } from "@/shared/lib/game-channel";
import { createPeerHostChannel } from "@/shared/lib/peer-game-channel";
import type { PeerStatus } from "@/shared/lib/peer-game-channel";

/**
 * TV 쪽 클릭 배틀. 상태의 원본을 들고 폰 메시지를 받아 심판한다.
 *
 * 저사양 사이니지 브라우저를 생각해 화면 갱신은 초당 5번으로 묶는다. 연타 메시지가
 * 몰려도 상태는 ref에서 바로 바뀌고, 그리기와 상태 방송만 묶어서 한다.
 */
const FRAME_MS = 200;
/** 바뀐 것이 없어도 이만큼마다 상태를 보낸다. 폰은 이 신호로 연결을 확인한다. */
const HEARTBEAT_MS = 1_000;

/**
 * 폰과 잇는 방법. `webrtc`는 실제 폰이 붙는다. `local`은 같은 브라우저 탭끼리만
 * 통해 개발 중에 시그널링 서버 없이 확인할 때 쓴다.
 */
export type BattleTransport = "webrtc" | "local";

export interface UseBattleHostOptions {
  transport?: BattleTransport;
  /** 테스트 주입용 */
  channel?: GameChannel<BattleClientMessage, BattleHostMessage>;
  now?: () => number;
}

export function useBattleHost(roomId: string, options: UseBattleHostOptions = {}) {
  const { channel: injected, now = Date.now, transport = "webrtc" } = options;
  /** 폰이 붙을 TV의 id. WebRTC에서만 생기고, 시그널링 서버가 정해 준다. */
  const [peerId, setPeerId] = useState<string | null>(null);
  const [status, setStatus] = useState<PeerStatus | null>(null);
  const [state, setState] = useState<BattleState>(initialBattle);
  const stateRef = useRef<BattleState>(state);
  const [clock, setClock] = useState(() => now());

  useEffect(() => {
    const channel =
      injected ??
      (transport === "webrtc"
        ? createPeerHostChannel<BattleClientMessage, BattleHostMessage>({
            onReady: setPeerId,
            onStatus: (next) => setStatus(next),
            // 탭을 닫은 폰은 "나간다"를 못 보낸다. 연결이 끊기면 대신 내보낸다.
            onDisconnect: (last) => ({ kind: "leave", playerId: last.playerId }),
          })
        : createBroadcastGameChannel<BattleClientMessage, BattleHostMessage>(roomId));
    let dirty = true;
    let sentAt = 0;

    const unsubscribe = channel.subscribe((message) => {
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
  }, [roomId, injected, now, transport]);

  return { state, now: clock, peerId, status };
}
