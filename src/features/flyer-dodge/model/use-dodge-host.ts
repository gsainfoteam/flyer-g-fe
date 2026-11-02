import { useCallback, useEffect, useRef, useState } from "react";
import { addDodgeRecord, readDodgeRanking } from "@/entities/game/model/dodge-ranking";
import type { DodgeRecord } from "@/entities/game/model/dodge-ranking";
import {
  DODGE_RULES,
  advanceDodge,
  applyDodgeMessage,
  dodgeView,
  initialDodge,
  isDodgeActive,
} from "@/entities/game/model/flyer-dodge";
import type {
  DodgeClientMessage,
  DodgeHostMessage,
  DodgeState,
} from "@/entities/game/model/flyer-dodge";
import { parseDodgeMessage } from "@/entities/game/model/flyer-dodge-messages";
import { createBroadcastGameChannel } from "@/shared/lib/game-channel";
import type { GameChannel } from "@/shared/lib/game-channel";
import { createPlayerBinding } from "@/shared/lib/player-binding";
import { createWsHostChannel } from "@/shared/lib/ws-game-channel";
import type { GameLinkStatus } from "@/shared/lib/ws-game-channel";

/**
 * TV 쪽 전단지 피하기. 판의 원본을 들고 폰 메시지를 받아 계산한다.
 *
 * 액션 게임이라 계산은 초당 30번 하고(`stateRef`), 화면의 전단지는 그 ref를 캔버스가
 * 바로 그린다. 정보(하트·점수·남은 초)와 폰 방송은 초당 5번으로 묶는다. 폰에는 전단지
 * 위치 없이 작은 요약만 보낸다(백엔드 중계의 크기·빈도 한도).
 */
const SIMULATE_MS = DODGE_RULES.stepMs;
const FRAME_MS = 200;
/** 바뀐 것이 없어도 이만큼마다 상태를 보낸다. 폰은 이 신호로 연결을 확인한다. */
const HEARTBEAT_MS = 1_000;

export interface UseDodgeHostOptions {
  /** 백엔드 게임 중계 주소. 없으면 같은 브라우저 탭끼리만 잇는다(개발용). */
  socketBase?: string | null;
  /** 이 TV(기기)의 기기 토큰. 서버 중계로 방을 열 때 필요하다. */
  token?: string | null;
  /**
   * 판이 이만큼 이어지면 플레이 중이 아닐 때 비운다(위젯용 상한). 없으면 제한하지 않는다.
   * 고정이 풀리면 도중에 생기므로 ref로 읽는다(방을 다시 열지 않는다).
   */
  sessionLimitMs?: number;
  /** 테스트 주입용 */
  channel?: GameChannel<DodgeClientMessage, DodgeHostMessage>;
  now?: () => number;
  seed?: number;
}

const rankingKey = (roomId: string) => `flyerg:dodge-ranking:${roomId}`;

function loadRanking(roomId: string): DodgeRecord[] {
  try {
    return readDodgeRanking(JSON.parse(window.localStorage.getItem(rankingKey(roomId)) ?? "[]"));
  } catch {
    return [];
  }
}

function saveRanking(roomId: string, ranking: readonly DodgeRecord[]) {
  try {
    window.localStorage.setItem(rankingKey(roomId), JSON.stringify(ranking));
  } catch {
    // 저장하지 못해도 이번 화면에서는 순위를 보여 준다.
  }
}

const randomSeed = () => {
  const value = new Uint32Array(1);
  crypto.getRandomValues(value);
  return value[0]! | 0;
};

export function useDodgeHost(roomId: string, options: UseDodgeHostOptions = {}) {
  const {
    channel: injected,
    now = Date.now,
    socketBase = null,
    token = null,
    sessionLimitMs,
    seed,
  } = options;
  const [status, setStatus] = useState<GameLinkStatus | null>(null);
  const [state, setState] = useState<DodgeState>(() => initialDodge(1, seed ?? randomSeed()));
  const stateRef = useRef<DodgeState>(state);
  const [clock, setClock] = useState(() => now());
  const [ranking, setRanking] = useState<DodgeRecord[]>(() => loadRanking(roomId));
  const rankRef = useRef<{ round: number; rank: number | null } | null>(null);
  const [lastRank, setLastRank] = useState<{ round: number; rank: number | null } | null>(null);
  const limitRef = useRef(sessionLimitMs);
  useEffect(() => {
    limitRef.current = sessionLimitMs;
  }, [sessionLimitMs]);

  useEffect(() => {
    // 기기 토큰이 없으면 방을 열 수 없다. 설정 링크로 다시 열어야 한다.
    if (socketBase && !token && !injected) return;

    // 폰은 자기 참가자 id를 스스로 정한다. 서버 연결 id에 묶어 남의 id를 못 쓰게 한다.
    const binding = createPlayerBinding();
    const channel =
      injected ??
      (socketBase && token
        ? createWsHostChannel<DodgeClientMessage, DodgeHostMessage>(socketBase, roomId, {
            token,
            onStatus: setStatus,
            // 탭을 닫은 폰은 "나간다"를 못 보낸다. 연결이 끊기면 그 연결의 참가자를 내보낸다.
            onDisconnect: (from) => {
              const playerId = binding.release(from);
              return playerId === null ? null : { kind: "leave", playerId };
            },
          })
        : createBroadcastGameChannel<DodgeClientMessage, DodgeHostMessage>(`flyer-dodge:${roomId}`));
    let dirty = true;
    let sentAt = 0;
    let activeSince: number | null = null;

    const rankOf = (current: DodgeState) =>
      rankRef.current?.round === current.round ? rankRef.current.rank : null;
    const sendState = (at: number) => {
      channel.send({ kind: "state", view: dodgeView(stateRef.current, at, rankOf(stateRef.current)), now: at });
    };

    const commit = (next: DodgeState) => {
      const previous = stateRef.current;
      if (next === previous) return;
      // 판이 막 끝났으면 이 TV 순위에 넣는다.
      if (next.phase === "RESULT" && previous.phase !== "RESULT" && next.result) {
        const added = addDodgeRecord(loadRanking(roomId), {
          name: next.result.name,
          score: next.result.score,
          at: next.phaseEndsAt! - DODGE_RULES.resultMs,
        });
        saveRanking(roomId, added.ranking);
        setRanking(added.ranking);
        rankRef.current = { round: next.round, rank: added.rank };
        setLastRank(rankRef.current);
      }
      stateRef.current = next;
      dirty = true;
    };

    const unsubscribe = channel.subscribe((raw, from) => {
      // 폰은 로그인하지 않는다. 모양이 틀리거나 남의 참가자 id를 쓴 메시지는 버린다.
      const message = parseDodgeMessage(raw);
      if (!message || !binding.claim(from, message.playerId)) return;
      const result = applyDodgeMessage(stateRef.current, message, now());
      commit(result.state);
      if (result.reply) channel.send(result.reply);
      // 새로 연결한 폰은 다음 방송을 기다리지 않고 바로 상태를 받는다.
      if (message.kind === "hello") sendState(now());
    });

    const simulate = window.setInterval(() => {
      const at = now();
      let next = advanceDodge(stateRef.current, at);
      const active = isDodgeActive(next);
      activeSince = active ? (activeSince ?? at) : null;
      const limit = limitRef.current;
      if (limit !== undefined && activeSince !== null && at - activeSince >= limit && next.phase !== "PLAYING") {
        next = initialDodge(next.round + 1, next.seed);
        activeSince = null;
      }
      commit(next);
    }, SIMULATE_MS);

    const frame = window.setInterval(() => {
      const at = now();
      if (dirty) setState(stateRef.current);
      if (dirty || at - sentAt >= HEARTBEAT_MS) {
        dirty = false;
        sentAt = at;
        sendState(at);
      }
      setClock(at);
    }, FRAME_MS);

    return () => {
      window.clearInterval(simulate);
      window.clearInterval(frame);
      unsubscribe();
      if (!injected) channel.close();
    };
  }, [roomId, injected, now, socketBase, token]);

  /** 초당 30번 바뀌는 원본. 캔버스가 매 프레임 읽는다. */
  const readState = useCallback(() => stateRef.current, []);

  return {
    state,
    readState,
    now: clock,
    ranking,
    /** 방금 끝난 판의 이 TV 순위 */
    rank: lastRank?.round === state.round ? lastRank.rank : null,
    active: isDodgeActive(state),
    status: socketBase && !token && !injected ? ("unauthorized" as const) : status,
  };
}
