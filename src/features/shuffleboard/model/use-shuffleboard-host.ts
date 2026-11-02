import { useEffect, useRef, useState } from "react";
import {
  advanceMatch,
  applyClientMessage,
  initialMatch,
} from "@/entities/game/model/shuffleboard";
import type {
  MatchClientMessage,
  MatchHostMessage,
  MatchState,
} from "@/entities/game/model/shuffleboard";
import { parseClientMessage } from "@/entities/game/model/shuffleboard-messages";
import { useGameBusy } from "@/shared/lib/game-busy";
import { createBroadcastGameChannel } from "@/shared/lib/game-channel";
import type { GameChannel } from "@/shared/lib/game-channel";
import { createWsHostChannel } from "@/shared/lib/ws-game-channel";
import type { GameLinkStatus } from "@/shared/lib/ws-game-channel";
import { createPlayerBinding, readSecret } from "@/shared/lib/player-binding";

/**
 * TV 쪽 셔플보드. 경기 상태의 원본을 들고 폰 메시지를 받아 심판한다.
 * 클릭 배틀의 `useBattleHost`와 같은 모양이다.
 *
 * 화면 갱신과 상태 방송은 초당 5번으로 묶는다. 원반이 굴러가는 애니메이션은 이
 * 주기와 상관없이 보드 그림(`BoardView`)이 스스로 그린다.
 */
const FRAME_MS = 200;
/** 바뀐 것이 없어도 이만큼마다 상태를 보낸다. 폰은 이 신호로 연결을 확인한다. */
const HEARTBEAT_MS = 1_000;

export interface UseShuffleboardHostOptions {
  /** 백엔드 게임 중계 주소. 없으면 같은 브라우저 탭끼리만 잇는다(개발용). */
  socketBase?: string | null;
  /** 이 TV(기기)의 기기 토큰. 서버 중계로 방을 열 때 필요하다. */
  token?: string | null;
  /** 한 명만 들어온 채 이만큼 지나면 방을 비운다(위젯용). 없으면 기다린다. */
  lobbyWaitMs?: number;
  /** 누군가 들어온 뒤 이만큼 지나면 경기 중이 아닐 때 방을 비운다(위젯용). */
  sessionLimitMs?: number;
  /** 테스트 주입용 */
  channel?: GameChannel<MatchClientMessage, MatchHostMessage>;
  now?: () => number;
}

/** 누군가 들어와 방이 살아 있는가. 이 동안 전단지 플레이어는 순환을 멈춘다. */
export function isMatchActive(state: MatchState): boolean {
  return state.phase !== "WAITING" || state.seats.A !== null || state.seats.B !== null;
}

export function newMatchId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // randomUUID가 없는 환경(보안 연결이 아닌 주소)에서도 서버가 받는 UUID v4 모양으로 만든다.
  const random = new Uint8Array(16);
  crypto.getRandomValues(random);
  random[6] = (random[6] & 0x0f) | 0x40;
  random[8] = (random[8] & 0x3f) | 0x80;
  const hex = Array.from(random, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * TV를 새로고침해도 경기가 이어지게 이 탭에 상태를 남긴다. (명세 13장 "TV 새로고침")
 * 시각은 모두 절대 시각(ms)이라 그대로 되살리면 남은 시간도 맞다.
 *
 * 새로고침 직후(30초 안)에만 되살린다. 오래된 경기(시간대가 끝나 위젯이 닫혔다가 몇 시간
 * 뒤 다시 뜰 때 등)를 되살리면 지난 턴들이 한꺼번에 시간 초과로 넘어가 몇 번 던지지도
 * 않고 끝나고, 떠난 사람의 자리가 남아 새 참가자가 못 들어온다.
 */
const storageKey = (roomId: string) => `flyerg:shuffleboard-host:${roomId}`;
export const RESTORE_WITHIN_MS = 30_000;
/**
 * 사람이 있는 동안에는 바뀐 것이 없어도 이만큼마다 다시 저장해 저장 시각을 새로 한다.
 * 한 명이 오래 기다리는 중에 새로고침해도 그 자리를 되살린다.
 */
const RESAVE_MS = 10_000;

export function restoreMatch(saved: string | null, now: number): MatchState | null {
  if (!saved) return null;
  try {
    const value = JSON.parse(saved) as { state?: MatchState; savedAt?: number };
    if (!value.state || typeof value.savedAt !== "number") return null;
    // 저장 뒤 흐른 시간이 0 이상이고 30초 안일 때만. 기기 시계가 뒤로 가 미래에 저장된 것처럼
    // 보이는 값은 믿지 않는다.
    const elapsed = now - value.savedAt;
    return elapsed >= 0 && elapsed <= RESTORE_WITHIN_MS ? value.state : null;
  } catch {
    return null;
  }
}

function restore(roomId: string, now: number): MatchState {
  try {
    const restored = restoreMatch(window.sessionStorage.getItem(storageKey(roomId)), now);
    if (restored) return restored;
  } catch {
    // 저장소를 못 쓰면 새 경기로 시작한다.
  }
  return initialMatch(1, newMatchId());
}

function save(roomId: string, state: MatchState, now: number) {
  try {
    window.sessionStorage.setItem(storageKey(roomId), JSON.stringify({ state, savedAt: now }));
  } catch {
    // 저장소를 못 써도 경기는 계속한다.
  }
}

export function useShuffleboardHost(roomId: string, options: UseShuffleboardHostOptions = {}) {
  const {
    channel: injected,
    now = Date.now,
    socketBase = null,
    token = null,
    lobbyWaitMs,
    sessionLimitMs,
  } = options;
  const [status, setStatus] = useState<GameLinkStatus | null>(null);
  const [state, setState] = useState<MatchState>(() => restore(roomId, now()));
  const stateRef = useRef<MatchState>(state);
  const [clock, setClock] = useState(() => now());
  // 상한은 도중에 바뀔 수 있다(시간대가 끝나 고정이 풀릴 때). 방을 다시 열면 하던 경기가
  // 사라지므로 effect가 아니라 ref로 읽는다. 클릭 배틀(useBattleHost)과 같다.
  const limitsRef = useRef({ lobbyWaitMs, sessionLimitMs });
  useEffect(() => {
    limitsRef.current = { lobbyWaitMs, sessionLimitMs };
  }, [lobbyWaitMs, sessionLimitMs]);

  useEffect(() => {
    // 기기 토큰이 없으면 방을 열 수 없다. 설정 링크로 다시 열어야 한다.
    if (socketBase && !token && !injected) return;

    // 폰은 자기 참가자 id를 스스로 정한다. 서버 연결 id에 묶어 남의 id를 못 쓰게 한다.
    const binding = createPlayerBinding();
    const channel =
      injected ??
      (socketBase && token
        ? createWsHostChannel<MatchClientMessage, MatchHostMessage>(socketBase, roomId, {
            token,
            onStatus: setStatus,
            // 다른 화면에 밀려났다 되찾으면 그 사이 경기를 알 수 없으니 새 경기로 시작한다.
            onReclaim: () => {
              commit(initialMatch(stateRef.current.round + 1, newMatchId()));
              activeSince = null;
              waitingSince = null;
            },
            // 탭을 닫은 폰은 "나간다"를 못 보낸다. 연결이 끊기면 그 연결의 참가자를 내보낸다.
            // 경기 중이면 엔진이 무시하고 자리를 지킨다.
            onDisconnect: (from) => {
              const playerId = binding.release(from);
              return playerId === null ? null : { kind: "leave", playerId };
            },
          })
        : createBroadcastGameChannel<MatchClientMessage, MatchHostMessage>(
            `shuffleboard:${roomId}`,
          ));
    let dirty = true;
    let sentAt = 0;
    let savedAt = 0;
    let activeSince: number | null = null;
    let waitingSince: number | null = null;

    const commit = (next: MatchState) => {
      if (next === stateRef.current) return;
      stateRef.current = next;
      dirty = true;
      savedAt = now();
      save(roomId, next, savedAt);
    };

    const unsubscribe = channel.subscribe((raw, from) => {
      // 폰은 로그인하지 않는다. 모양이 틀리거나 남의 참가자 id를 쓴 메시지는 버린다.
      const message = parseClientMessage(raw);
      // 같은 폰의 새 연결(네트워크가 바뀜)은 비밀 값으로 알아본다.
      if (!message || !binding.claim(from, message.playerId, readSecret(raw))) return;
      const result = applyClientMessage(stateRef.current, message, now());
      commit(result.state);
      if (result.reply) channel.send(result.reply);
      if (message.kind === "hello") {
        channel.send({ kind: "state", state: stateRef.current, now: now() });
      }
    });

    const timer = window.setInterval(() => {
      const at = now();
      let next = stateRef.current;
      // 탭이 오래 멈췄으면 밀린 단계를 한꺼번에 넘긴다.
      for (let step = 0; step < 32; step++) {
        const advanced = advanceMatch(next, at, newMatchId);
        if (advanced === next) break;
        next = advanced;
      }
      // 위젯으로 뜰 때만: 오래 기다리거나 오래 붙잡으면 방을 비워 순환으로 돌려보낸다.
      const { lobbyWaitMs, sessionLimitMs } = limitsRef.current;
      const active = isMatchActive(next);
      activeSince = active ? (activeSince ?? at) : null;
      const waiting = next.phase === "WAITING" && active;
      waitingSince = waiting ? (waitingSince ?? at) : null;
      const waitedTooLong =
        lobbyWaitMs !== undefined && waitingSince !== null && at - waitingSince >= lobbyWaitMs;
      // 경기 중과 결과 화면은 끊지 않는다. 결과는 끝까지 보여 주고 폰에도 전한 뒤 비운다.
      const sessionTooLong =
        sessionLimitMs !== undefined &&
        activeSince !== null &&
        at - activeSince >= sessionLimitMs &&
        next.phase !== "PLAYING" &&
        next.phase !== "FINISHED";
      if (waitedTooLong || sessionTooLong) {
        next = initialMatch(next.round + 1, newMatchId());
        activeSince = null;
        waitingSince = null;
      }
      commit(next);
      // 방이 살아 있는 동안만 저장 시각을 새로 한다. 화면을 떠나면 이 timer도 멈춘다.
      if (isMatchActive(stateRef.current) && at - savedAt >= RESAVE_MS) {
        savedAt = at;
        save(roomId, stateRef.current, at);
      }

      if (dirty) setState(stateRef.current);
      if (dirty || at - sentAt >= HEARTBEAT_MS) {
        dirty = false;
        sentAt = at;
        channel.send({ kind: "state", state: stateRef.current, now: at });
      }
      setClock(at);
    }, FRAME_MS);

    return () => {
      window.clearInterval(timer);
      unsubscribe();
      if (!injected) channel.close();
    };
  }, [roomId, injected, now, socketBase, token]);

  const active = isMatchActive(state);
  useGameBusy(active);

  return {
    state,
    now: clock,
    active,
    status: socketBase && !token && !injected ? ("unauthorized" as const) : status,
  };
}
