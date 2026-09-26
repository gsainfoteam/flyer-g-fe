import { useEffect, useMemo, useRef, useState } from "react";
import { FOUR_GRID_SLOT_COUNT } from "@/entities/playlist/model/types";
import type { LayoutType } from "@/entities/playlist/model/types";
import type { PosterRenderModel } from "@/entities/poster";

/**
 * 재생 순환 (명세 FR-PLY-03).
 *
 * - SINGLE은 포스터 하나가 한 페이지, FOUR_GRID는 최대 4개가 한 페이지다.
 *   4분할도 페이지 단위로 순환한다.
 * - 목록이 갱신되어도 지금 보이는 페이지의 첫 항목을 따라간다. 편성이 바뀔 때마다
 *   첫 페이지로 튀면 뒤쪽 포스터는 영영 못 보는 기기가 생긴다.
 * - 페이지가 하나뿐이면 timer를 만들지 않는다.
 * - 탭이 가려진 동안 setInterval은 브라우저가 늦출 수 있다. 다시 보이면 즉시
 *   다음 페이지로 넘겨 오래 멈춘 화면을 정리한다.
 */
export function chunkIntoPages(
  posters: PosterRenderModel[],
  layout: LayoutType,
): PosterRenderModel[][] {
  if (posters.length === 0) return [];
  if (layout === "SINGLE") return posters.map((poster) => [poster]);

  const pages: PosterRenderModel[][] = [];
  for (let i = 0; i < posters.length; i += FOUR_GRID_SLOT_COUNT) {
    pages.push(posters.slice(i, i + FOUR_GRID_SLOT_COUNT));
  }
  return pages;
}

export interface UseRotationOptions {
  posters: PosterRenderModel[];
  layout: LayoutType;
  rotationSeconds: number;
  /** preview 모드의 일시정지 */
  paused?: boolean;
}

export function useRotation({
  posters,
  layout,
  rotationSeconds,
  paused = false,
}: UseRotationOptions) {
  // 페이지 identity는 배열 참조가 아니라 **내용**으로 고정한다. 호출부가 렌더마다
  // 새 배열을 만들어도 내용이 같으면 pages가 유지되어야 한다. 참조로 두면 위치
  // 복원 effect와 anchor 갱신 effect가 서로를 되받아치는 무한 루프가 된다.
  const signature = `${layout}::${posters.map((item) => item.id).join("|")}`;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- posters는 signature로 대표된다
  const pages = useMemo(() => chunkIntoPages(posters, layout), [signature]);

  const [pageIndex, setPageIndex] = useState(0);
  /** 지금 보이는 페이지의 첫 포스터. 목록이 갱신될 때 위치를 되찾는 기준이다. */
  const anchorIdRef = useRef<string | null>(null);

  const safeIndex = pages.length === 0 ? 0 : pageIndex % pages.length;

  // 편성이 바뀌면 보고 있던 항목이 있는 페이지를 따라간다.
  // 순서가 중요하다: anchor 갱신 effect보다 먼저 실행되어 갱신 전 anchor를 읽는다.
  useEffect(() => {
    const anchorId = anchorIdRef.current;
    if (anchorId === null) return;
    const found = pages.findIndex((page) =>
      page.some((poster) => poster.id === anchorId),
    );
    setPageIndex(found >= 0 ? found : 0);
  }, [pages]);

  useEffect(() => {
    anchorIdRef.current = pages[safeIndex]?.[0]?.id ?? anchorIdRef.current;
  }, [pages, safeIndex]);

  useEffect(() => {
    if (paused || pages.length <= 1) return;
    const id = window.setInterval(() => {
      setPageIndex((index) => (index + 1) % pages.length);
    }, rotationSeconds * 1000);
    return () => window.clearInterval(id);
  }, [paused, pages.length, rotationSeconds]);

  // 탭이 다시 보이면 즉시 한 페이지 넘긴다. 멈춰 있던 화면을 정리하는 목적이다.
  useEffect(() => {
    if (pages.length <= 1) return;
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        setPageIndex((index) => (index + 1) % pages.length);
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [pages.length]);

  const advance = () => {
    if (pages.length === 0) return;
    setPageIndex((index) => (index + 1) % pages.length);
  };

  return {
    pages,
    pageIndex: safeIndex,
    currentPage: pages[safeIndex] ?? [],
    pageCount: pages.length,
    advance,
  };
}
