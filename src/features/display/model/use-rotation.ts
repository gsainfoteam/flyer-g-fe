import { useEffect, useMemo, useRef, useState } from "react";
import type { LayoutType } from "@/entities/playlist/model/types";
import type { PosterRenderModel } from "@/entities/poster";
import { buildFrames } from "@/entities/poster/model/frames";

/**
 * 재생 순환 (명세 FR-PLY-03).
 *
 * - 편성을 화면 순서(`buildFrames`)로 펼쳐 전환 간격마다 한 장씩 넘긴다.
 * - 목록이 갱신되어도 지금 보이는 화면을 따라간다. 편성이 바뀔 때마다 처음으로
 *   튀면 뒤쪽 게시물은 영영 못 보는 기기가 생긴다.
 * - 화면이 하나뿐이면 timer를 만들지 않는다.
 * - 탭이 가려진 동안 setInterval은 브라우저가 늦출 수 있다. 다시 보이면 즉시
 *   다음 화면으로 넘겨 오래 멈춘 화면을 정리한다.
 */
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
  // 화면 identity는 배열 참조가 아니라 **내용**으로 고정한다. 호출부가 렌더마다
  // 새 배열을 만들어도 내용이 같으면 frames가 유지되어야 한다. 참조로 두면 위치
  // 복원 effect와 anchor 갱신 effect가 서로를 되받아치는 무한 루프가 된다.
  // 배치는 크기에, 그림은 URL과 버전에 기대므로 함께 센다.
  const signature = `${layout}::${posters
    .map(
      (item) =>
        `${item.id}@${item.revision ?? ""}:${item.width}x${item.height}:${item.posterUrl}`,
    )
    .join("|")}`;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- posters는 signature로 대표된다
  const frames = useMemo(() => buildFrames(posters, layout), [signature]);

  const [frameIndex, setFrameIndex] = useState(0);
  /** 지금 보이는 화면의 key. 목록이 갱신될 때 위치를 되찾는 기준이다. */
  const anchorKeyRef = useRef<string | null>(null);

  const safeIndex = frames.length === 0 ? 0 : frameIndex % frames.length;

  // 편성이 바뀌면 보고 있던 화면을 따라간다.
  // 순서가 중요하다: anchor 갱신 effect보다 먼저 실행되어 갱신 전 anchor를 읽는다.
  useEffect(() => {
    const anchorKey = anchorKeyRef.current;
    if (anchorKey === null) return;
    const found = frames.findIndex((frame) => frame.key === anchorKey);
    setFrameIndex(found >= 0 ? found : 0);
  }, [frames]);

  useEffect(() => {
    anchorKeyRef.current = frames[safeIndex]?.key ?? anchorKeyRef.current;
  }, [frames, safeIndex]);

  useEffect(() => {
    if (paused || frames.length <= 1) return;
    const id = window.setInterval(() => {
      setFrameIndex((index) => (index + 1) % frames.length);
    }, rotationSeconds * 1000);
    return () => window.clearInterval(id);
  }, [paused, frames.length, rotationSeconds]);

  // 탭이 다시 보이면 즉시 한 화면 넘긴다. 멈춰 있던 화면을 정리하는 목적이다.
  // 미리보기에서 일시정지했으면 그대로 둔다.
  useEffect(() => {
    if (paused || frames.length <= 1) return;
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        setFrameIndex((index) => (index + 1) % frames.length);
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [paused, frames.length]);

  const advance = () => {
    if (frames.length === 0) return;
    setFrameIndex((index) => (index + 1) % frames.length);
  };

  return {
    frames,
    frameIndex: safeIndex,
    currentFrame: frames[safeIndex],
    nextFrame:
      frames.length > 1 ? frames[(safeIndex + 1) % frames.length] : undefined,
    frameCount: frames.length,
    advance,
  };
}
