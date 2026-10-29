import type { DataConnection, Peer } from "peerjs";
import type { GameChannel } from "./game-channel";

/**
 * WebRTC로 TV와 폰을 직접 잇는 `GameChannel` (PeerJS).
 *
 * TV가 호스트다. 시그널링 서버에서 무작위 id를 받아 QR에 싣고, 폰은 그 id로 TV에
 * 붙는다. 연결이 맺어진 뒤 메시지는 서버를 거치지 않고 TV와 폰 사이를 오간다.
 *
 * - 시그널링은 PeerJS 공개 서버(0.peerjs.com)를 쓴다. 운영에서는 자체 서버로 바꾼다.
 * - TURN 서버가 없어 학내 망이 직접 연결을 막으면 붙지 않는다. 실제 망에서 확인한다.
 * - peerjs는 게임 화면에서만 필요해 처음 쓸 때 불러온다. 플레이어 chunk에 넣지 않는다.
 */
export type PeerStatus = "connecting" | "open" | "error";

interface PeerOptions {
  onStatus?: (status: PeerStatus, detail?: string) => void;
}

export interface PeerHostOptions<Incoming> extends PeerOptions {
  /** 시그널링 서버에서 id를 받으면 부른다. 폰이 붙을 주소에 싣는다. */
  onReady: (peerId: string) => void;
  /**
   * 폰 연결이 끊겼을 때 대신 받을 메시지. 그 연결이 마지막으로 보낸 메시지를 준다.
   * 탭을 닫아 "나간다"를 못 보낸 폰도 명단에서 빼려는 것이다.
   */
  onDisconnect?: (lastMessage: Incoming) => Incoming | null;
}

const RECONNECT_MS = 2_000;
/** 연결 전에 쌓아 둘 메시지 수. 오래 못 붙으면 오래된 것부터 버린다. */
const MAX_QUEUE = 50;

export function createPeerHostChannel<Incoming, Outgoing>(
  options: PeerHostOptions<Incoming>,
): GameChannel<Incoming, Outgoing> {
  const listeners = new Set<(message: Incoming) => void>();
  const connections = new Set<DataConnection>();
  let peer: Peer | null = null;
  let closed = false;

  const emit = (message: Incoming) => listeners.forEach((listener) => listener(message));

  options.onStatus?.("connecting");
  void import("peerjs").then(({ Peer }) => {
    if (closed) return;
    peer = new Peer();
    peer.on("open", (id) => {
      options.onStatus?.("open");
      options.onReady(id);
    });
    peer.on("connection", (connection) => {
      let last: Incoming | null = null;
      connection.on("open", () => connections.add(connection));
      connection.on("data", (data) => {
        last = data as Incoming;
        emit(last);
      });
      connection.on("close", () => {
        connections.delete(connection);
        const replacement = last && options.onDisconnect?.(last);
        if (replacement) emit(replacement);
      });
    });
    // 시그널링 서버와 끊겨도 이미 붙은 폰과의 연결은 산다. 새 폰을 받으려고 다시 붙는다.
    peer.on("disconnected", () => {
      if (closed) return;
      window.setTimeout(() => peer?.reconnect(), RECONNECT_MS);
    });
    peer.on("error", (error) => options.onStatus?.("error", error.type));
  });

  return {
    send(message) {
      for (const connection of connections) {
        if (connection.open) connection.send(message);
      }
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    close() {
      closed = true;
      connections.clear();
      peer?.destroy();
    },
  };
}

export function createPeerClientChannel<Incoming, Outgoing>(
  hostId: string,
  options: PeerOptions = {},
): GameChannel<Incoming, Outgoing> {
  const listeners = new Set<(message: Incoming) => void>();
  /** 연결 전에 보낸 메시지. 붙으면 차례로 보낸다. */
  let queue: Outgoing[] = [];
  let peer: Peer | null = null;
  let connection: DataConnection | null = null;
  let closed = false;

  const connect = () => {
    if (closed || !peer || peer.destroyed) return;
    options.onStatus?.("connecting");
    const next = peer.connect(hostId, { reliable: true });
    connection = next;
    next.on("open", () => {
      options.onStatus?.("open");
      const pending = queue;
      queue = [];
      pending.forEach((message) => next.send(message));
    });
    next.on("data", (data) => listeners.forEach((listener) => listener(data as Incoming)));
    // TV가 새로고침되거나 망이 잠깐 끊기면 다시 붙는다.
    next.on("close", () => {
      if (!closed) window.setTimeout(connect, RECONNECT_MS);
    });
  };

  void import("peerjs").then(({ Peer }) => {
    if (closed) return;
    peer = new Peer();
    peer.on("open", connect);
    peer.on("error", (error) => {
      options.onStatus?.("error", error.type);
      // TV가 아직 없거나 사라졌으면 잠시 뒤 다시 찾는다.
      if (error.type === "peer-unavailable") window.setTimeout(connect, RECONNECT_MS);
    });
  });

  return {
    send(message) {
      if (connection?.open) connection.send(message);
      else {
        queue.push(message);
        if (queue.length > MAX_QUEUE) queue.shift();
      }
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    close() {
      // 마지막 메시지("나간다")가 나갈 틈을 두고 끊는다.
      closed = true;
      const current = connection;
      const currentPeer = peer;
      window.setTimeout(() => {
        current?.close();
        currentPeer?.destroy();
      }, 200);
    },
  };
}
