import type { PlaylistItem } from "@/entities/playlist/model/types";
import type { SubmissionView } from "@/entities/submission/model/types";

/**
 * 포스터를 그리는 화면들이 공유하는 표현 모델.
 *
 * 관리자 웹의 카드·미리보기와 TV 플레이어가 같은 렌더러를 쓰게 하기 위한 계약이다.
 * (명세 FR-SUB-03 "미리보기 전용 구현과 플레이어 구현의 스타일 분기를 최소화한다")
 */
export interface PosterRenderModel {
  id: string;
  title: string;
  subtitle: string | null;
  categoryName: string;
  /** 주최. 신청자가 자유 입력한다. 없으면 null */
  organizerName: string | null;
  location: string | null;
  posterUrl: string;
  /**
   * 원본 크기(px). TV는 이 비율로 칸을 잡아 이미지를 자르지 않고 그린다.
   * 모르면 0이고, 그때는 세로 포스터 비율로 본다(`posterAspect`).
   */
  width: number;
  height: number;
  /** QR과 상세 링크의 단일 원천. 없으면 QR 없이 그린다. */
  detailUrl: string | null;
  startAt: Date;
  endAt: Date;
  /** 편성에 실린 신청 버전. 노출 이벤트가 어느 버전을 보여줬는지 남긴다. */
  revision?: number | null;
}

/** 크기를 모를 때 쓰는 비율. 게시물 대부분이 A판 세로 포스터다. */
export const FALLBACK_ASPECT = 1 / Math.SQRT2;

/** 가로÷세로. 크기를 모르면 세로 포스터 비율이다. */
export function posterAspect(
  poster: Pick<PosterRenderModel, "width" | "height">,
): number {
  return poster.width > 0 && poster.height > 0
    ? poster.width / poster.height
    : FALLBACK_ASPECT;
}

/** 원본 크기를 아는가. 모르면 칸을 비율로 맞출 수 없어 이미지를 잘라 채우지 않는다. */
export function hasKnownSize(
  poster: Pick<PosterRenderModel, "width" | "height">,
): boolean {
  return poster.width > 0 && poster.height > 0;
}

export function fromSubmissionView(view: SubmissionView): PosterRenderModel {
  return {
    id: view.id,
    title: view.title,
    subtitle: view.subtitle ?? view.description,
    categoryName: view.categoryName,
    organizerName: view.organizerName,
    location: view.location,
    posterUrl: view.posterUrl,
    width: view.posterWidth,
    height: view.posterHeight,
    detailUrl: view.detailUrl,
    startAt: view.startAt,
    endAt: view.endAt,
    revision: view.version,
  };
}

export function fromPlaylistItem(item: PlaylistItem): PosterRenderModel {
  return {
    id: item.submissionId,
    title: item.title,
    subtitle: item.subtitle ?? null,
    categoryName: item.category,
    organizerName: item.organizerName ?? null,
    location: item.location ?? null,
    posterUrl: item.assetUrl,
    width: item.width,
    height: item.height,
    detailUrl: item.detailUrl,
    startAt: item.startsAt,
    endAt: item.endsAt,
    revision: item.revision,
  };
}
