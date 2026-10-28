/**
 * TV 위젯. 승인된 포스터가 아니라 화면이 직접 만드는 콘텐츠다(D-day, 운세 등).
 * 포스터 회전 사이에 끼워 넣는다. 검토가 필요 없는 콘텐츠만 둔다.
 *
 * 백엔드에는 아직 위젯이 없다. 편성 응답에 `widgets`가 오면 읽고, 없으면 빈 목록이다.
 * 지금은 mock 편성만 보낸다.
 *
 * 외부 데이터(학식·날씨·맛집)는 TV가 직접 받지 않는다. 서버가 주기적으로 모아
 * 슬롯의 `params.data`에 실어 보낸다. API 키를 TV에 두지 않고, 편성과 함께 오프라인
 * 캐시에 남는다.
 */
export const WIDGET_TYPES = [
  "DDAY",
  "EXAM_CHEER",
  "FORTUNE",
  "MEAL_PICK",
  "CAFETERIA",
  "WEATHER",
  "RESTAURANT",
] as const;
export type WidgetType = (typeof WIDGET_TYPES)[number];

/**
 * 위젯이 화면에 머무는 기본 시간(초). 콘텐츠마다 읽는 데 걸리는 시간이 달라 종류별로
 * 둔다. 운영자가 슬롯마다 `durationSeconds`로 바꿀 수 있다.
 */
export const DEFAULT_WIDGET_DURATION: Record<WidgetType, number> = {
  DDAY: 5,
  EXAM_CHEER: 10,
  FORTUNE: 30,
  MEAL_PICK: 10,
  CAFETERIA: 10,
  WEATHER: 10,
  RESTAURANT: 10,
};

/** 위젯 머무는 시간의 안전 범위. 포스터 노출을 너무 오래 막지 않게 한다. */
export const WIDGET_DURATION_SECONDS = { min: 5, max: 300 } as const;

/** 포스터 화면 몇 장마다 위젯을 한 번 끼우는가의 기본값 */
export const DEFAULT_WIDGET_EVERY_FRAMES = 4;

export interface WidgetSlotDto {
  id: string;
  type: string;
  /** 화면에 머무는 시간(초). 없으면 종류별 기본값 */
  durationSeconds?: number;
  /** 포스터 화면 몇 장마다 한 번 나오는가. 없으면 기본값 */
  everyFrames?: number;
  /** 종류별 설정. D-day 날짜, 시험 기간 등 */
  params?: Record<string, unknown>;
}

export interface WidgetSlot {
  id: string;
  type: WidgetType;
  durationSeconds: number;
  everyFrames: number;
  params: Record<string, unknown>;
}

export function clampWidgetDuration(type: WidgetType, value?: number): number {
  if (value === undefined || !Number.isFinite(value) || value <= 0) {
    return DEFAULT_WIDGET_DURATION[type];
  }
  return Math.min(
    WIDGET_DURATION_SECONDS.max,
    Math.max(WIDGET_DURATION_SECONDS.min, Math.round(value)),
  );
}

function readWidgetType(value: string): WidgetType | null {
  return (WIDGET_TYPES as readonly string[]).includes(value)
    ? (value as WidgetType)
    : null;
}

/** 전송 모델 → 도메인 모델. 모르는 종류는 버린다. 새 위젯이 생겨도 옛 TV가 멈추지 않는다. */
export function toWidgetSlots(dtos: WidgetSlotDto[] | undefined): WidgetSlot[] {
  return (dtos ?? []).flatMap((dto) => {
    const type = readWidgetType(dto.type);
    if (type === null) return [];
    const every = dto.everyFrames;
    return [
      {
        id: dto.id,
        type,
        durationSeconds: clampWidgetDuration(type, dto.durationSeconds),
        everyFrames:
          every !== undefined && Number.isFinite(every) && every >= 1
            ? Math.round(every)
            : DEFAULT_WIDGET_EVERY_FRAMES,
        params: dto.params ?? {},
      },
    ];
  });
}

/** 도메인 모델 → 전송 모델. 오프라인 캐시가 직렬화할 때 쓴다. */
export function toWidgetSlotDtos(slots: WidgetSlot[]): WidgetSlotDto[] {
  return slots.map((slot) => ({ ...slot }));
}
