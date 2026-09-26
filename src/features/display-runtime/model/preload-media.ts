import type { Playlist } from "@/entities/playlist/model/types";

/**
 * 편성의 모든 포스터를 내려받아 검증한다 (명세 FR-PLY-07).
 *
 * decode까지 확인한다. 내려받았지만 그릴 수 없는 blob을 캐시하면 오프라인에서
 * 깨진 화면이 나온다. 하나라도 실패하면 전체를 실패로 본다 — 부분 캐시는
 * 승격하지 않기 때문이다.
 *
 * 이미 캐시에 있는 checksum은 다시 받지 않는다. 편성은 1분마다 바뀔 수 있고,
 * 포스터 하나가 추가될 때마다 전부 다시 받으면 기기 회선과 CDN을 낭비한다.
 */
export type MediaFetcher = (url: string) => Promise<Blob>;

export const fetchMediaBlob: MediaFetcher = async (url) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`미디어를 내려받지 못했습니다: ${response.status}`);
  }
  return response.blob();
};

export type MediaDecoder = (blob: Blob) => Promise<void>;

export const decodeWithBrowser: MediaDecoder = async (blob) => {
  const bitmap = await createImageBitmap(blob);
  bitmap.close();
};

export interface PreloadOptions {
  fetcher?: MediaFetcher;
  decoder?: MediaDecoder;
  /** 이미 검증해 저장해 둔 미디어. 있으면 내려받지 않는다. */
  reuse?: (checksum: string) => Promise<Blob | undefined>;
}

/** checksum → Blob. 같은 checksum은 한 번만 받는다. */
export async function preloadPlaylistMedia(
  playlist: Playlist,
  options: PreloadOptions = {},
): Promise<Map<string, Blob>> {
  const fetcher = options.fetcher ?? fetchMediaBlob;
  const decoder = options.decoder ?? decodeWithBrowser;

  const targets = new Map<string, string>();
  for (const item of playlist.items) {
    if (!targets.has(item.checksum)) targets.set(item.checksum, item.assetUrl);
  }

  const media = new Map<string, Blob>();
  await Promise.all(
    [...targets].map(async ([checksum, assetUrl]) => {
      const stored = await options.reuse?.(checksum).catch(() => undefined);
      if (stored) {
        media.set(checksum, stored);
        return;
      }
      const blob = await fetcher(assetUrl);
      await decoder(blob);
      media.set(checksum, blob);
    }),
  );
  return media;
}
