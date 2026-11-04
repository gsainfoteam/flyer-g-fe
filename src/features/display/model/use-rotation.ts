import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LayoutType } from "@/entities/playlist/model/types";
import type { PosterRenderModel } from "@/entities/poster";
import {
  buildContentFrames,
  buildFrames,
  mixContentFrames,
  posterFrameSeconds,
} from "@/entities/poster/model/frames";
import type {
  ContentScenes,
  DisplayFrame,
} from "@/entities/poster/model/frames";
import type { WidgetPick } from "@/entities/widget/model/policy";
import { placeWidgetSlots } from "@/entities/widget/model/schedule";
import type { FrameTemplate, PlayerFrame } from "@/entities/widget/model/schedule";

/**
 * 재생 순환 (명세 FR-PLY-03).
 *
 * - 편성을 화면 순서(`buildFrames`)로 펼치고 포스터 `widgetInterval`장마다 위젯 자리를
 *   둔다(`placeWidgetSlots`). 위젯 자리에 오면 `pickWidget`으로 지금 띄울 위젯을
 *   고르고, 없으면 그 자리는 건너뛴다. 포스터는 기기 전환 간격(영상은 끝까지 볼 만큼),
 *   위젯은 자기 시간만큼 머문다.
 * - 목록이 갱신되어도 지금 보이는 화면을 따라간다. 편성이 바뀔 때마다 처음으로
 *   튀면 뒤쪽 게시물은 영영 못 보는 기기가 생긴다.
 * - 화면이 하나뿐이면 timer를 만들지 않는다. 위젯만 도는 경우는 예외다.
 * - 탭이 가려진 동안 timer는 브라우저가 늦출 수 있다. 다시 보이면 즉시
 *   다음 화면으로 넘겨 오래 멈춘 화면을 정리한다.
 */
export interface UseRotationOptions {
  posters: PosterRenderModel[];
  /** 포스터 사이에 끼울 이벤트 배너·제보 장면 */
  content?: ContentScenes;
  layout: LayoutType;
  rotationSeconds: number;
  /** 포스터 화면 몇 장마다 위젯 자리를 둘까. 0이면 위젯 없음 */
  widgetInterval?: number;
  /** 한 바퀴에 둘 위젯 자리의 최소 개수. 포스터가 적을 때 채운다(`fillSlotCount`). */
  widgetMinSlots?: number;
  /**
   * 위젯 자리에 왔을 때 띄울 위젯을 고른다. 없으면 그 자리를 건너뛴다. `avoidId`는
   * 바로 앞 화면의 위젯이다. 같은 위젯이 연달아 나오지 않게 한다.
   */
  pickWidget?: (avoidId?: string) => WidgetPick | null;
  /** preview 모드의 일시정지 */
  paused?: boolean;
  /** 지금 화면에 머문다(게임 세션 중). 풀리면 호출부가 `advance`로 넘긴다. */
  hold?: boolean;
}

interface Position {
  index: number;
  /** 지금 자리가 위젯 자리면 고른 위젯 */
  pick: WidgetPick | null;
}

const NO_CONTENT: ContentScenes = { eventBanners: [], stories: [] };

export function useRotation({
  posters,
  content = NO_CONTENT,
  layout,
  rotationSeconds,
  widgetInterval = 0,
  widgetMinSlots = 0,
  pickWidget,
  paused: pausedByUser = false,
  hold = false,
}: UseRotationOptions) {
  const paused = pausedByUser || hold;
  // 화면 identity는 배열 참조가 아니라 **내용**으로 고정한다. 호출부가 렌더마다
  // 새 배열을 만들어도 내용이 같으면 frames가 유지되어야 한다. 참조로 두면 위치
  // 복원 effect와 anchor 갱신 effect가 서로를 되받아치는 무한 루프가 된다.
  // 배치는 크기에, 그림은 URL과 버전에 기대므로 함께 센다.
  const interval = pickWidget ? widgetInterval : 0;
  const minSlots = pickWidget ? widgetMinSlots : 0;
  const signature = `${layout}::${interval}:${minSlots}::${posters
    .map(
      (item) =>
        `${item.id}@${item.revision ?? ""}:${item.width}x${item.height}:${item.posterUrl}:${item.durationMs ?? ""}`,
    )
    .join("|")}::${[...content.eventBanners, ...content.stories]
    .map((item) => `${item.submissionId}@${item.checksum}`)
    .join("|")}`;
  const frames = useMemo<FrameTemplate[]>(
    () =>
      placeWidgetSlots(
        mixContentFrames(
          buildFrames(posters, layout),
          buildContentFrames(content),
        ),
        interval,
        minSlots,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- posters는 signature로 대표된다
    [signature],
  );
  // 띠 화면은 포스터를 들고 있지 않아 머무는 시간을 펼칠 때 함께 정한다.
  const posterSeconds = useMemo(
    () =>
      frames.map((frame) =>
        frame.kind === "widget-slot"
          ? rotationSeconds
          : posterFrameSeconds(frame, posters, rotationSeconds),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- posters는 frames(signature)로 대표된다
    [frames, rotationSeconds],
  );

  // 고르는 함수는 렌더마다 새로 올 수 있다. timer가 다시 걸리지 않게 ref로 든다.
  const pickRef = useRef(pickWidget);
  useEffect(() => {
    pickRef.current = pickWidget;
  }, [pickWidget]);

  const [position, setPosition] = useState<Position>({ index: 0, pick: null });
  const positionRef = useRef(position);
  useEffect(() => {
    positionRef.current = position;
  }, [position]);
  /** 지금 보이는 화면의 key. 목록이 갱신될 때 위치를 되찾는 기준이다. */
  const anchorKeyRef = useRef<string | null>(null);

  const safeIndex = frames.length === 0 ? 0 : position.index % frames.length;

  /**
   * `from` 다음부터 보여 줄 수 있는 첫 화면. 위젯 자리는 고를 위젯이 있어야 한다.
   * 넘어가는 경우 그 사이 자리는 모두 건너뛴 것이라, 바로 앞 화면은 지금 화면이다.
   */
  const nextFrom = useCallback(
    (from: number, includeSelf = false): Position | null => {
      const avoidId = includeSelf ? undefined : positionRef.current.pick?.slot.id;
      for (let step = includeSelf ? 0 : 1; step <= frames.length; step++) {
        const index = (from + step) % frames.length;
        const frame = frames[index]!;
        if (frame.kind !== "widget-slot") return { index, pick: null };
        const pick = pickRef.current?.(avoidId) ?? null;
        if (pick) return { index, pick };
      }
      return null;
    },
    [frames],
  );

  // 편성이 바뀌면 보고 있던 화면을 따라간다. 처음이거나 못 찾으면 맨 앞부터.
  // 순서가 중요하다: anchor 갱신 effect보다 먼저 실행되어 갱신 전 anchor를 읽는다.
  useEffect(() => {
    if (frames.length === 0) return;
    const anchorKey = anchorKeyRef.current;
    const found =
      anchorKey === null ? -1 : frames.findIndex((frame) => frame.key === anchorKey);
    if (found >= 0 && (frames[found]!.kind !== "widget-slot" || positionRef.current.pick)) {
      setPosition((current) => ({ index: found, pick: current.pick }));
      return;
    }
    const start = nextFrom(found >= 0 ? found : 0, true);
    if (start) setPosition(start);
  }, [frames, nextFrom]);

  useEffect(() => {
    anchorKeyRef.current = frames[safeIndex]?.key ?? anchorKeyRef.current;
  }, [frames, safeIndex]);

  /** 넘어간 횟수. 같은 화면이 다시 와도 정보줄 진행 막대를 처음부터 채우는 데 쓴다. */
  const [serial, setSerial] = useState(0);

  const step = useCallback(() => {
    const next = nextFrom(positionRef.current.index);
    if (!next) return;
    positionRef.current = next;
    setPosition(next);
    setSerial((count) => count + 1);
  }, [nextFrom]);

  const current: PlayerFrame | undefined = (() => {
    const frame = frames[safeIndex];
    if (!frame) return undefined;
    if (frame.kind !== "widget-slot") return frame;
    return position.pick
      ? { kind: "widget", key: frame.key, slot: position.pick.slot, content: position.pick.content }
      : undefined;
  })();

  // 위젯만 도는 경우(포스터 없음)는 자리가 하나여도 다음 위젯으로 넘겨야 한다.
  const rotates =
    frames.length > 1 || (frames.length === 1 && frames[0]!.kind === "widget-slot");

  // 화면마다 머무는 시간이 달라 한 장씩 timer를 건다. 다음 timer는 콜백이 바로
  // 건다. 렌더를 기다려 다시 걸면 탭이 느려졌을 때 밀린 전환을 따라잡지 못한다.
  useEffect(() => {
    if (paused || !rotates) return;
    let id: number;
    const schedule = () => {
      const { index, pick } = positionRef.current;
      const frame = frames[index % frames.length]!;
      const seconds =
        frame.kind === "widget-slot"
          ? (pick?.slot.durationSeconds ?? rotationSeconds)
          : posterSeconds[index % frames.length]!;
      id = window.setTimeout(() => {
        step();
        schedule();
      }, seconds * 1000);
    };
    schedule();
    return () => window.clearTimeout(id);
  }, [paused, rotates, frames, posterSeconds, rotationSeconds, step]);

  // 탭이 다시 보이면 즉시 한 화면 넘긴다. 멈춰 있던 화면을 정리하는 목적이다.
  // 미리보기에서 일시정지했으면 그대로 둔다.
  useEffect(() => {
    if (paused || !rotates) return;
    const onVisible = () => {
      if (document.visibilityState === "visible") step();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [paused, rotates, step]);

  const nextTemplate =
    frames.length > 1 ? frames[(safeIndex + 1) % frames.length] : undefined;
  const currentTemplate = frames[safeIndex];

  return {
    frames,
    frameIndex: safeIndex,
    currentFrame: current,
    /** 다음 포스터 화면. 이미지를 미리 받는 데 쓴다. 위젯 자리면 없다. */
    nextFrame:
      nextTemplate && nextTemplate.kind !== "widget-slot"
        ? (nextTemplate as DisplayFrame)
        : undefined,
    frameCount: frames.length,
    advance: step,
    /** 지금 화면이 머무는 시간(초) */
    frameSeconds: !currentTemplate
      ? rotationSeconds
      : currentTemplate.kind === "widget-slot"
        ? (position.pick?.slot.durationSeconds ?? rotationSeconds)
        : posterSeconds[safeIndex]!,
    /** 다음 자리(위젯 자리일 수 있다). 화면이 하나뿐이면 지금 자리다. 정보줄 "다음" 표시용 */
    upcoming: rotates ? frames[(safeIndex + 1) % frames.length] : undefined,
    /** 지금 위젯. 다음 위젯을 미리 볼 때 바로 앞 위젯을 피하는 데 쓴다. */
    currentPickId: position.pick?.slot.id,
    /** 넘어갈 때마다 1씩 는다. */
    serial,
    /** 저절로 넘어가는가(일시정지·붙잡기 아님, 화면이 둘 이상) */
    moving: rotates && !paused,
  };
}
