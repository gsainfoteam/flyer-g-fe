import type { PlaylistItem } from "@/entities/playlist/model/types";
import type { SubmissionView } from "@/entities/submission/model/types";

/**
 * 포스터를 그리는 화면들이 공유하는 표현 모델.
 *
 * 관리자 웹의 카드·미리보기와 TV 플레이어가 같은 렌더러를 쓰게 하기 위한 계약이다.
 * (명세 FR-SUB-03 "미리보기 전용 구현과 플레이어 구현의 스타일 분기를 최소화한다")
 *
 * 실제 렌더러 컴포넌트는 Phase 02와 05에서 완성한다. 여기서는 props 계약만 고정한다.
 */
export interface PosterRenderModel {
  id: string;
  title: string;
  subtitle: string | null;
  categoryName: string;
  organizationName: string;
  location: string | null;
  posterUrl: string;
  /** QR과 상세 링크의 단일 원천 */
  detailUrl: string;
  startAt: Date;
  endAt: Date;
}

export function fromSubmissionView(view: SubmissionView): PosterRenderModel {
  return {
    id: view.id,
    title: view.title,
    subtitle: view.subtitle ?? view.description,
    categoryName: view.categoryName,
    organizationName: view.organizationName,
    location: view.location,
    posterUrl: view.posterUrl,
    detailUrl: view.detailUrl,
    startAt: view.startAt,
    endAt: view.endAt,
  };
}

export function fromPlaylistItem(item: PlaylistItem): PosterRenderModel {
  return {
    id: item.submissionId,
    title: item.title,
    subtitle: item.subtitle ?? null,
    categoryName: item.category,
    organizationName: item.organizerName ?? "",
    location: item.location ?? null,
    posterUrl: item.assetUrl,
    detailUrl: item.detailUrl,
    startAt: item.startsAt,
    endAt: item.endsAt,
  };
}
