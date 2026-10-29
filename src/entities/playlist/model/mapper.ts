import { parseIsoUtc, toIsoUtc } from "@/shared/lib/datetime";
import { toWidgetSlotDtos, toWidgetSlots } from "@/entities/widget/model/types";
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
    widgets: toWidgetSlots(dto.widgets),
  };
}

/** 도메인 모델 → 전송 모델. 오프라인 캐시가 직렬화할 때 쓴다. */
export function toPlaylistDto(playlist: Playlist): PlaylistDto {
  return {
    serverTime: toIsoUtc(playlist.serverTime),
    deviceName: playlist.deviceName,
    playlistVersion: playlist.playlistVersion,
    refreshAfterSeconds: playlist.refreshAfterSeconds,
    layout: playlist.layout,
    items: playlist.items.map((item) => ({
      ...item,
      startsAt: toIsoUtc(item.startsAt),
      endsAt: toIsoUtc(item.endsAt),
    })),
    widgets: toWidgetSlotDtos(playlist.widgets),
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
  const at = now.getTime();
  return playlist.items.filter(
    (item) => at >= item.startsAt.getTime() && at < item.endsAt.getTime(),
  );
}
