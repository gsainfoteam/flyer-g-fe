import { toPlaylist, toPlaylistDto } from "@/entities/playlist";
import type { Playlist, PlaylistDto } from "@/entities/playlist/model/types";
import type { KeyValueStore } from "@/shared/storage";

/**
 * 편성·미디어 오프라인 캐시 (명세 FR-PLY-07).
 *
 * 편성 metadata와 미디어 blob을 분리해 저장한다. 미디어는 checksum이 key라
 * 편성이 갱신되어도 내용이 같은 포스터는 다시 받지 않는다.
 *
 * **완전히 준비된 편성만 last-known-good로 승격한다.** 포스터 절반만 있는 캐시를
 * 재생하면 오프라인에서 빈 칸이 섞인 화면이 나온다.
 *
 * 시각 판정용으로 서버-기기 시계 차이를 함께 저장한다. 오프라인에서는 기기
 * 시계밖에 없지만, 마지막으로 안 서버 시각과의 차이를 보정해 쓴다.
 */
const PLAYLIST_KEY = "playlist:last-known-good";
const MEDIA_KEY_PREFIX = "media:";

const mediaKey = (checksum: string) => `${MEDIA_KEY_PREFIX}${checksum}`;

interface CachedPlaylistRecord {
  dto: PlaylistDto;
  /** 저장 시점의 기기 시각. 서버-기기 시계 차이 계산에 쓴다. */
  storedAtClient: string;
}

export interface LoadedPlaylistCache {
  playlist: Playlist;
  /** submissionId → 로컬 blob URL */
  posterUrls: ReadonlyMap<string, string>;
  /** 저장 당시 서버시각 - 기기시각 (ms). 오프라인 시각 보정에 쓴다. */
  clockOffsetMs: number;
  /** blob URL 해제. 화면을 떠나거나 새 편성으로 교체할 때 반드시 부른다. */
  release(): void;
}

export interface PlaylistCache {
  load(): Promise<LoadedPlaylistCache | null>;
  /** checksum으로 이미 저장한 미디어를 찾는다. 새 편성에서 다시 받지 않기 위해 쓴다. */
  findMedia(checksum: string): Promise<Blob | undefined>;
  /** blob이 전부 갖춰졌을 때만 부른다. 참조가 끊긴 미디어는 정리한다. */
  save(playlist: Playlist, media: ReadonlyMap<string, Blob>): Promise<void>;
}

export function createPlaylistCache(store: KeyValueStore): PlaylistCache {
  return {
    async findMedia(checksum) {
      const blob = await store.get<Blob>(mediaKey(checksum));
      return blob instanceof Blob ? blob : undefined;
    },

    async load() {
      const record = await store.get<CachedPlaylistRecord>(PLAYLIST_KEY);
      if (!record) return null;

      const playlist = toPlaylist(record.dto);
      const urls = new Map<string, string>();

      for (const item of playlist.items) {
        const blob = await store.get<Blob>(mediaKey(item.checksum));
        // 승격 시점에는 전부 있었지만 이후 정리·손상될 수 있다. 없으면 항목을
        // 버리는 것은 호출부(재생 규칙) 몫이라 여기서는 URL만 비워 둔다.
        if (blob instanceof Blob) {
          urls.set(item.submissionId, URL.createObjectURL(blob));
        }
      }

      const storedAtClient = new Date(record.storedAtClient).getTime();
      const clockOffsetMs = Number.isFinite(storedAtClient)
        ? playlist.serverTime.getTime() - storedAtClient
        : 0;

      return {
        playlist,
        posterUrls: urls,
        clockOffsetMs,
        release() {
          for (const url of urls.values()) URL.revokeObjectURL(url);
        },
      };
    },

    async save(playlist, media) {
      for (const item of playlist.items) {
        if (!media.has(item.checksum)) {
          throw new Error(
            `미디어가 빠진 편성은 캐시로 승격할 수 없습니다: ${item.submissionId}`,
          );
        }
      }

      for (const [checksum, blob] of media) {
        await store.set(mediaKey(checksum), blob);
      }
      const record: CachedPlaylistRecord = {
        dto: toPlaylistDto(playlist),
        storedAtClient: new Date().toISOString(),
      };
      await store.set(PLAYLIST_KEY, record);

      // 새 편성이 참조하지 않는 미디어를 정리한다. 저장 공간은 기기에서 유한하다.
      const referenced = new Set(
        playlist.items.map((item) => mediaKey(item.checksum)),
      );
      for (const key of await store.keys()) {
        if (key.startsWith(MEDIA_KEY_PREFIX) && !referenced.has(key)) {
          await store.delete(key);
        }
      }
    },
  };
}
