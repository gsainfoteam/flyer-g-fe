import { parseIsoUtc, toIsoUtc } from "@/shared/lib/datetime";
import {
  clampRotationSeconds,
  DEFAULT_LAYOUT_TYPE,
  readLayoutType,
} from "./types";
import type { Playlist, PlaylistDto, PlaylistItem, PlaylistItemDto } from "./types";

function toPlaylistItem(dto: PlaylistItemDto): PlaylistItem {
  return {
    ...dto,
    startsAt: parseIsoUtc(dto.startsAt),
    endsAt: parseIsoUtc(dto.endsAt),
    kind: dto.kind ?? "IMAGE",
    width: dto.width ?? 0,
    height: dto.height ?? 0,
    durationMs: dto.durationMs ?? null,
    video: dto.video ?? null,
  };
}

export function toPlaylist(dto: PlaylistDto): Playlist {
  return {
    serverTime: parseIsoUtc(dto.serverTime),
    deviceName: dto.deviceName ?? null,
    playlistVersion: dto.playlistVersion,
    refreshAfterSeconds: dto.refreshAfterSeconds,
    layout: {
      // 예전 값(SINGLE·FOUR_GRID)으로 저장한 오프라인 캐시도 읽는다.
      type: readLayoutType(dto.layout.type) ?? DEFAULT_LAYOUT_TYPE,
      rotationSeconds: clampRotationSeconds(dto.layout.rotationSeconds),
    },
    items: dto.items.map(toPlaylistItem),
    eventBanners: (dto.eventBanners ?? []).map(withDates),
    stories: (dto.stories ?? []).map(withDates),
  };
}

function withDates<T extends { startsAt: string; endsAt: string }>(
  dto: T,
): Omit<T, "startsAt" | "endsAt"> & { startsAt: Date; endsAt: Date } {
  return {
    ...dto,
    startsAt: parseIsoUtc(dto.startsAt),
    endsAt: parseIsoUtc(dto.endsAt),
  };
}

function withIsoDates<T extends { startsAt: Date; endsAt: Date }>(
  item: T,
): Omit<T, "startsAt" | "endsAt"> & { startsAt: string; endsAt: string } {
  return {
    ...item,
    startsAt: toIsoUtc(item.startsAt),
    endsAt: toIsoUtc(item.endsAt),
  };
}

/** 지금 게시 기간 안인가. 서버가 거른 값을 클라이언트도 다시 본다. */
export function isPlayableAt(
  item: { startsAt: Date; endsAt: Date },
  now: Date,
): boolean {
  const at = now.getTime();
  return at >= item.startsAt.getTime() && at < item.endsAt.getTime();
}

/**
 * 편성이 쓰는 미디어. 오프라인 캐시가 받아 두는 목록이다. 문구만 있는 배너와 제보는
 * 미디어가 없다.
 */
export function mediaOfPlaylist(
  playlist: Playlist,
): { submissionId: string; checksum: string; url: string }[] {
  return [
    ...playlist.items.map((item) => ({
      submissionId: item.submissionId,
      checksum: item.checksum,
      url: item.assetUrl,
    })),
    ...playlist.eventBanners.flatMap((banner) => {
      const url = banner.assetUrl ?? banner.photoUrl;
      return url
        ? [
            {
              submissionId: banner.submissionId,
              checksum: banner.checksum,
              url,
            },
          ]
        : [];
    }),
  ];
}

/** 도메인 모델 → 전송 모델. 오프라인 캐시가 직렬화할 때 쓴다. */
export function toPlaylistDto(playlist: Playlist): PlaylistDto {
  return {
    serverTime: toIsoUtc(playlist.serverTime),
    deviceName: playlist.deviceName,
    playlistVersion: playlist.playlistVersion,
    refreshAfterSeconds: playlist.refreshAfterSeconds,
    layout: playlist.layout,
    items: playlist.items.map(withIsoDates),
    eventBanners: playlist.eventBanners.map(withIsoDates),
    stories: playlist.stories.map(withIsoDates),
  };
}

/**
 * 서버가 유효 편성을 보내지만 클라이언트도 방어적으로 기간을 다시 확인한다.
 * 명세 FR-PLY-01, Phase 05 인수 조건
 */
export function selectPlayableItems(
  playlist: Playlist,
  now: Date = playlist.serverTime,
): PlaylistItem[] {
  return playlist.items.filter((item) => isPlayableAt(item, now));
}
