import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, SkipForward } from "lucide-react";
import { useParams, useSearchParams } from "react-router";
import { Logo } from "@/shared/components/Logo";
import { DisplayStage } from "@/entities/poster/ui/DisplayStage";
import { LiveClock } from "@/shared/components/LiveClock";
import { ScaledStage } from "@/entities/poster/ui/ScaledStage";
import {
  useDeviceTelemetry,
  useOfflinePlaylist,
  usePlaybackReporting,
  usePrefetchImages,
} from "@/features/display";
import { useRotation } from "@/features/display/model/use-rotation";
import { useTimeSlot } from "@/features/display/model/use-time-slot";
import { useTimeSlotRules } from "@/features/display/model/use-tv-settings";
import {
  DEFAULT_LAYOUT_TYPE,
  PREVIEW_DEVICE_ID,
} from "@/entities/playlist/model/types";
import {
  buildFrames,
  exposedPosters,
  imagesOf,
} from "@/entities/poster/model/frames";
import { StageFrame } from "@/entities/poster/ui/StageFrame";
import { INFO_BAR_HEIGHT } from "@/entities/poster/ui/stage-metrics";
import {
  buildCafeteriaContent,
  buildWeatherContent,
  readWebUrl,
} from "@/entities/widget/model/data-content";
import { cafeteriaDataFor } from "@/entities/widget/model/cafeteria-week";
import { buildWidgetContent, seoulDateKey } from "@/entities/widget/model/content";
import { ddayChip, mealChip } from "@/entities/widget/model/info-bar";
import {
  isWidgetsUnsupported,
  operationWidgets,
} from "@/entities/widget/model/feed";
import {
  MIN_CYCLE_SECONDS,
  createWidgetPicker,
  fillSlotCount,
  widgetInterval,
} from "@/entities/widget/model/policy";
import type {
  FrameTemplate,
  PlayerFrame,
} from "@/entities/widget/model/schedule";
import { WIDGET_LABELS } from "@/entities/widget/model/settings";
import { DEFAULT_WIDGET_DURATION } from "@/entities/widget/model/types";
import type { WidgetSlot } from "@/entities/widget/model/types";
import { StageInfoBar } from "@/entities/widget/ui/StageInfoBar";
import { WidgetDisplay } from "@/entities/widget/ui/WidgetDisplay";
import { useDeviceWidgets } from "@/features/display/model/use-device-widgets";
import { useLocalCafeteria } from "@/features/display/model/use-local-cafeteria";
import { useLocalWeather } from "@/features/display/model/use-local-weather";
import { gameSocketBase } from "@/features/click-battle/api/game-socket";
import { BattlePreview } from "@/features/click-battle/ui/BattlePreview";
import { BattleWidget } from "@/features/click-battle/ui/BattleWidget";
import { toUserMessage } from "@/shared/api/error";
import type { ApiError } from "@/shared/api/error";
import {
  captureDeviceTokenFromUrl,
  deviceCredentials,
} from "@/shared/lib/device-credential";
import { ZIGGLE_HOST } from "@/shared/lib/ziggle-url";
import { Button } from "@/shared/ui/button";

/**
 * TV 플레이어 (명세 FR-PLY-01 ~ FR-PLY-08).
 *
 * 운영 모드에는 조작 UI도 커서도 없다. `?preview=1`일 때만 관리자용 컨트롤을
 * 보여준다.
 *
 * 회복력:
 * - 갱신 실패 → 마지막 편성 계속, 지수 backoff로 재시도
 * - 네트워크 없음 → 검증된 last-known-good 캐시 재생 (만료 적용)
 * - 이미지 실패 → 이번 편성 동안 그 항목을 건너뛰고 계속
 * - 아무것도 없음 → 브랜드·시각·안내 fallback
 *
 * 상태 보고(heartbeat)와 노출 이벤트는 실패해도 재생을 멈추지 않는다.
 *
 * 기기 연결: 관리자가 준 설정 링크(`/display/{id}#token=...`)로 한 번 열면 토큰을
 * 저장하고 주소에서 지운다. 토큰이 없거나 거절되면 설정 링크로 다시 열라고 안내하고
 * 재생하지 않는다(`useOfflinePlaylist`). 네트워크 실패는 저장된 편성을 계속 재생한다.
 */
export function DisplayPage() {
  const { deviceId = PREVIEW_DEVICE_ID } = useParams();
  const [searchParams] = useSearchParams();
  const isPreview = searchParams.get("preview") === "1";
  // 첫 편성 요청보다 먼저 설정 링크의 토큰을 저장한다. 렌더 중에 한 번만 한다.
  useState(() => captureDeviceTokenFromUrl(deviceId));

  const feed = useOfflinePlaylist(deviceId);
  const playlistVersion = feed.playlist?.playlistVersion ?? null;
  // 등록되지 않은 기기(미리보기 등)는 이름 없이 그린다.
  const deviceLabel = feed.playlist?.deviceName ?? null;

  const telemetry = useDeviceTelemetry(deviceId, playlistVersion, {
    enabled: !isPreview,
  });

  // 이미지를 못 불러온 항목은 이번 편성 동안 건너뛴다. 편성이 바뀌면 다시 시도한다.
  // 잠깐의 CDN 오류로 재부팅 전까지 포스터가 빠지면 안 된다. (명세 FR-PLY-06)
  const [failed, setFailed] = useState<{
    version: string | null;
    ids: ReadonlySet<string>;
  }>({ version: null, ids: new Set() });
  const failedIds = failed.version === playlistVersion ? failed.ids : null;

  const posters = useMemo(
    () =>
      (feed.playlist?.posters ?? []).filter(
        (poster) => !failedIds?.has(poster.id),
      ),
    [feed.playlist, failedIds],
  );

  const layout = feed.playlist?.layout.type ?? DEFAULT_LAYOUT_TYPE;
  const rotationSeconds = feed.playlist?.layout.rotationSeconds ?? 10;
  const serverTime = feed.playlist?.serverTime ?? null;

  // 위젯은 편성과 따로 받는다. 서버가 아직 지원하지 않으면 위젯 없이 돈다.
  const widgetFeed = useDeviceWidgets(
    deviceId,
    feed.playlist?.refreshAfterSeconds ?? 60,
  );
  // 서버가 날씨를 주지 않으면 TV가 직접 받는다(Open-Meteo). 정보줄와 날씨 위젯이 쓴다.
  const localWeather = useLocalWeather(widgetFeed.weather === null);
  const weatherData = widgetFeed.weather ?? localWeather;

  // 위젯을 고를 때의 "지금"(서버 시각). 편성의 서버 시각은 경계마다만 바뀌므로 기기
  // 시계와의 차이를 두고 흘려 쓴다.
  const clockOffsetRef = useRef(0);
  useEffect(() => {
    if (serverTime) clockOffsetRef.current = serverTime.getTime() - Date.now();
  }, [serverTime]);

  // 게임 위젯은 이 TV가 게임 방을 열 수 있을 때 실제로 돈다. 서버 중계면 기기 토큰이
  // 있어야 하고, mock이면 같은 브라우저 탭끼리 연다. 토큰이 없는 미리보기는 방 없이
  // 모양만 보여 준다(BattlePreview). 그 밖에 방을 못 여는 화면에서는 건너뛴다.
  const socketBase = gameSocketBase();
  const [gameToken] = useState(() => deviceCredentials.get(deviceId));
  const canHostGame = socketBase === null || gameToken !== null;
  const previewGame = !canHostGame && deviceId === PREVIEW_DEVICE_ID;
  // 시간대 점유(관리 화면 설정, 없으면 operation.ts). 이 시간에는 순환을 붙잡고 정한
  // 위젯만 띄운다.
  const timeSlotRules = useTimeSlotRules(deviceId);
  const timeSlot = useTimeSlot(serverTime, timeSlotRules);

  // 포스터 한 바퀴가 짧으면(편성이 한두 장) 남는 시간을 위젯으로 채운다. 서버에 위젯
  // API가 아직 없으면 그때만 데이터가 필요 없는 기본 위젯을 쓴다. 포스터가 충분하면
  // 운영자가 정하지 않은 위젯은 끼우지 않는다.
  const posterFrameCount = useMemo(
    () => buildFrames(posters, layout).length,
    [posters, layout],
  );
  const shortCycle = posterFrameCount * rotationSeconds < MIN_CYCLE_SECONDS;
  const fillWithStandalone = shortCycle;
  const unsupported = isWidgetsUnsupported(widgetFeed);
  const baseSlots = useMemo(
    () =>
      unsupported ? operationWidgets(fillWithStandalone) : widgetFeed.widgets,
    [unsupported, fillWithStandalone, widgetFeed.widgets],
  );
  // 서버가 학식을 주지 않으면 같은 도메인 함수(/api/cafeteria)가 학교 게시판에서 읽은
  // 이번 주 식단을 쓴다. 학식 위젯과 정보줄 식사 칩이 함께 쓴다.
  const serverCafeteria = baseSlots.find(
    (slot) => slot.type === "CAFETERIA" && slot.params.data,
  );
  const cafeteriaPlace = baseSlots.find((slot) => slot.type === "CAFETERIA")
    ?.params.place;
  const localCafeteria = useLocalCafeteria(!serverCafeteria);
  const todayKey = serverTime ? seoulDateKey(serverTime) : null;
  const widgetSlots = useMemo(() => {
    const today = todayKey ? new Date(`${todayKey}T12:00:00+09:00`) : null;
    const slots = baseSlots.map((slot) => {
      if (slot.params.data) return slot;
      // 데이터 없는 날씨·학식 위젯(기본 위젯·미리보기)에는 TV가 받은 데이터를 붙인다.
      const data =
        slot.type === "WEATHER"
          ? weatherData
          : slot.type === "CAFETERIA" && today
            ? cafeteriaDataFor(localCafeteria, slot.params.place, today)
            : null;
      return data ? { ...slot, params: { ...slot.params, data } } : slot;
    });
    return canHostGame || previewGame
      ? slots
      : slots.filter((slot) => slot.type !== "CLICK_BATTLE");
  }, [
    canHostGame,
    previewGame,
    baseSlots,
    weatherData,
    localCafeteria,
    todayKey,
  ]);

  // 위젯 노출 정책: 포스터 N장마다 한 자리, 비율 상한, 시간대·간격 (policy.ts)
  // 고르기는 차례와 간격을 기억한다. 렌더 중에 정보줄의 "다음"을 미리 보느라 읽으므로
  // ref가 아니라 state에 둔다(한 번 만들고 바꾸지 않는다).
  const [picker] = useState(createWidgetPicker);
  const hasServerTime = serverTime !== null;
  const pickWidget = useCallback(
    (avoidId?: string) =>
      hasServerTime
        ? picker.pick(
            widgetSlots,
            new Date(Date.now() + clockOffsetRef.current),
            avoidId,
          )
        : null,
    [hasServerTime, picker, widgetSlots],
  );

  // 게임 위젯에서 누가 참가하면 게임이 끝날 때까지 그 화면에 머문다. 이 시간은 위젯
  // 비율에 넣지 않는다(사람들이 원해서 하는 시간이다).
  const [gameActive, setGameActive] = useState(false);

  // 시간대가 점유한 화면. 설정된 같은 종류 위젯이 있으면 그 설정(데이터)을 쓴다. 게임은
  // 방을 열 수 있는 TV에서만 띄우고, 내용이 없는 위젯(데이터 없음)이면 순환을 그대로 둔다.
  const takeoverFrame: PlayerFrame | null = (() => {
    if (!timeSlot || !serverTime) return null;
    const { rule } = timeSlot;
    if (rule.widget === "CLICK_BATTLE" && !(canHostGame || previewGame)) return null;
    const slot = widgetSlots.find((item) => item.type === rule.widget) ?? {
      id: `time-slot-${rule.id}`,
      type: rule.widget,
      durationSeconds: DEFAULT_WIDGET_DURATION[rule.widget],
      params: {},
    };
    const content = buildWidgetContent(slot, serverTime);
    return content
      ? { kind: "widget", key: `time-slot:${rule.id}`, slot, content }
      : null;
  })();
  const takeover = takeoverFrame !== null;
  // 행사 화면에만 붙이는 설문 QR. 링크가 비었거나 http(s)가 아니면 띄우지 않는다.
  const takeoverSurveyUrl = takeover
    ? readWebUrl(timeSlot?.rule.survey?.url)
    : null;
  const takeoverSurvey =
    takeoverSurveyUrl && timeSlot?.rule.survey
      ? { url: takeoverSurveyUrl, label: timeSlot.rule.survey.label }
      : null;

  // 시간대가 끝날 때 게임이 진행 중이면 그 판은 마저 하게 둔다. 끝나는 순간의 화면을
  // 들고 있다가, 판이 끝나면(onSessionEnd) 순환으로 돌아간다. 이때는 고정이 아니므로
  // 위젯의 세션 상한이 다시 걸려, 끝난 판 뒤 새 판으로 이어지지 않는다.
  const [lastTakeover, setLastTakeover] = useState<{
    frame: PlayerFrame;
    survey: typeof takeoverSurvey;
    label: string;
  } | null>(null);
  if (takeoverFrame && timeSlot && lastTakeover?.frame.key !== takeoverFrame.key) {
    setLastTakeover({ frame: takeoverFrame, survey: takeoverSurvey, label: timeSlot.rule.label });
  } else if (!takeoverFrame && !gameActive && lastTakeover) {
    setLastTakeover(null);
  }
  const overtime = !takeover && gameActive ? lastTakeover : null;

  const [paused, setPaused] = useState(false);
  const rotation = useRotation({
    posters,
    layout,
    rotationSeconds,
    widgetInterval: widgetInterval(
      widgetSlots,
      rotationSeconds,
      widgetFeed.ratioPercent,
    ),
    widgetMinSlots: fillSlotCount(
      posterFrameCount,
      rotationSeconds,
      widgetSlots,
    ),
    pickWidget,
    paused: isPreview && paused,
    hold: gameActive || takeover,
  });

  const nextFrame = rotation.nextFrame;
  usePrefetchImages(imagesOf(nextFrame, posters));

  // 실제로 그려진 이미지. 노출 기록과 정상 렌더링 보고는 뜬 화면만 센다.
  const [loadedIds, setLoadedIds] = useState<ReadonlySet<string>>(new Set());
  const handlePosterLoad = useCallback((posterId: string) => {
    setLoadedIds((current) =>
      current.has(posterId) ? current : new Set(current).add(posterId),
    );
  }, []);
  const handlePosterError = useCallback(
    (posterId: string) => {
      setFailed((current) => ({
        version: playlistVersion,
        ids: new Set(
          current.version === playlistVersion ? current.ids : [],
        ).add(posterId),
      }));
    },
    [playlistVersion],
  );

  // 점유 시간에는 하던 순환을 그대로 보관하고 그 화면만 띄운다. 끝나면 이어서 돈다.
  const frame: PlayerFrame | undefined =
    takeoverFrame ?? overtime?.frame ?? rotation.currentFrame;

  // 위젯 화면은 게시물 노출이 아니다. 행사 화면 뒤에 보관한 포스터도 집계하지 않는다.
  const exposed =
    frame && frame.kind !== "widget"
      ? exposedPosters(frame, posters)
      : [];
  usePlaybackReporting({
    page: exposed,
    rendered:
      exposed.length > 0 && exposed.every((poster) => loadedIds.has(poster.id)),
    rotationSeconds,
    recordExposure: telemetry.recordExposure,
    reportRenderOk: telemetry.reportRenderOk,
  });

  // 화면이 바뀔 때 새로 그려 부드럽게 나타나게 한다. 띠는 한 덩어리로 두고
  // 칸만 미끄러지게 한다.
  const frameKey = frame?.kind === "strip" ? "strip" : (frame?.key ?? "");

  // 아래 정보줄. 같은 내용의 위젯이 화면을 채우는 동안에는 그 칩을 숨긴다.
  const showing = frame?.kind === "widget" ? frame.content.type : null;
  const weather = serverTime
    ? buildWeatherContent({ data: weatherData }, serverTime)
    : null;
  const meal = (() => {
    if (!serverTime || !todayKey) return null;
    const tomorrow = new Date(`${todayKey}T12:00:00+09:00`);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const today =
      serverCafeteria?.params.data ??
      cafeteriaDataFor(localCafeteria, cafeteriaPlace, serverTime);
    const mealsOf = (data: unknown, day: Date) =>
      buildCafeteriaContent({ data }, day)?.meals ?? [];
    return mealChip(
      mealsOf(today, serverTime),
      mealsOf(
        cafeteriaDataFor(localCafeteria, cafeteriaPlace, tomorrow),
        tomorrow,
      ),
      serverTime,
    );
  })();
  const upcoming = rotation.upcoming;
  const infoBar = (
    <StageInfoBar
      now={serverTime}
      clockTicking
      weather={showing === "WEATHER" ? null : weather}
      meal={showing === "CAFETERIA" ? null : meal}
      dday={
        showing === "DDAY" || showing === "EXAM_CHEER" || !serverTime
          ? null
          : ddayChip(widgetSlots, serverTime)
      }
      status={
        takeover && timeSlot
          ? `${timeSlot.rule.label} · ${timeSlot.rule.time.to}까지`
          : overtime
            ? `${overtime.label} · 마지막 판 진행 중`
            : gameActive
            ? "클릭 배틀 진행 중"
            : null
      }
      next={
        rotation.moving && upcoming && serverTime
          ? {
              label: frameLabel(upcoming, posters, () =>
                picker.peek(widgetSlots, serverTime, rotation.currentPickId),
              ),
              seconds: rotation.frameSeconds,
              key: String(rotation.serial),
            }
          : null
      }
    />
  );

  return (
    <div className="relative h-full">
      <ScaledStage className="h-full w-full">
        {feed.deviceError ? (
          <DeviceSetupNotice error={feed.deviceError} deviceId={deviceId} />
        ) : feed.isPending || !serverTime ? (
          <div className="flex h-full flex-col items-center justify-center gap-6">
            <Logo size="tv" />
            <p className="text-[30px] text-ink-subtle">편성을 불러오는 중</p>
          </div>
        ) : (
          <StageFrame bar={infoBar}>
            {!frame ? (
              <EmptyDisplay deviceLabel={deviceLabel} serverTime={serverTime} />
            ) : frame.kind === "widget" &&
              frame.content.type === "CLICK_BATTLE" ? (
              <div
                key={frameKey}
                className="h-full animate-in duration-500 fade-in"
              >
                {previewGame ? (
                  <BattlePreview
                    deviceLabel={deviceLabel}
                    serverTime={serverTime}
                  />
                ) : (
                  <BattleWidget
                    roomId={deviceId}
                    socketBase={socketBase}
                    token={gameToken}
                    deviceLabel={deviceLabel}
                    serverTime={serverTime}
                    onActiveChange={setGameActive}
                    onSessionEnd={() => {
                      if (!takeover) rotation.advance();
                    }}
                    pinned={takeover}
                    survey={takeoverSurvey ?? overtime?.survey ?? null}
                  />
                )}
              </div>
            ) : frame.kind === "widget" ? (
              <WidgetFrame
                key={frameKey}
                frame={frame}
                deviceLabel={deviceLabel}
                serverTime={serverTime}
              />
            ) : (
              <div
                key={frameKey}
                className="h-full animate-in duration-500 fade-in"
              >
                <DisplayStage
                  frame={frame}
                  posters={posters}
                  deviceLabel={deviceLabel}
                  serverTime={serverTime}
                  clockTicking
                  onPosterError={handlePosterError}
                  onPosterLoad={handlePosterLoad}
                />
              </div>
            )}
          </StageFrame>
        )}
        {/* 배포 환경에서도 preview=1이면 표시. 본문과 정보줄 사이 간격 안에 둔다. */}
        {isPreview && (
          <div
            role="toolbar"
            aria-label="미리보기 조작"
            className="absolute left-1/2 z-10 flex h-10 -translate-x-1/2 items-center gap-2 rounded-pill bg-ink/85 px-3 text-ink-inverse shadow-floating"
            style={{ bottom: INFO_BAR_HEIGHT + 4 }}
          >
            <span className="text-caption font-bold">미리보기</span>
            {feed.source === "cache" && (
              <span className="rounded-pill bg-white/15 px-2 py-0.5 text-caption">
                오프라인 편성
              </span>
            )}
            <Button
              variant="ghost"
              size="icon-xs"
              className="text-ink-inverse hover:bg-white/15 hover:text-ink-inverse"
              onClick={() => setPaused((value) => !value)}
              aria-label={paused ? "재생" : "일시정지"}
            >
              {paused ? (
                <Play aria-hidden="true" />
              ) : (
                <Pause aria-hidden="true" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              className="text-ink-inverse hover:bg-white/15 hover:text-ink-inverse"
              onClick={rotation.advance}
              disabled={takeover || rotation.frameCount <= 1}
              aria-label="다음 화면"
            >
              <SkipForward aria-hidden="true" />
            </Button>
            <span className="text-caption tabular-nums text-white/70">
              {takeover ? "시간대 고정" : `${rotation.frameIndex + 1} / ${Math.max(rotation.frameCount, 1)}`}
            </span>
          </div>
        )}
      </ScaledStage>
    </div>
  );
}

function WidgetFrame({
  frame,
  deviceLabel,
  serverTime,
}: {
  frame: Extract<PlayerFrame, { kind: "widget" }>;
  deviceLabel: string | null;
  serverTime: Date;
}) {
  // 내용은 자리에 왔을 때 고르며 이미 만들어 두었다(policy.ts).
  return (
    <div className="h-full animate-in duration-500 fade-in">
      <WidgetDisplay
        content={frame.content}
        deviceLabel={deviceLabel}
        serverTime={serverTime}
        clockTicking
      />
    </div>
  );
}

/**
 * 유효 콘텐츠가 없을 때 (명세 FR-PLY-06).
 * 검은 화면은 고장으로 보인다. 브랜드와 시각을 유지해 "정상인데 비어 있음"을 알린다.
 */
function EmptyDisplay({
  deviceLabel,
  serverTime,
}: {
  deviceLabel: string | null;
  serverTime: Date;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-4">
        <Logo size="tv" />
        {deviceLabel && (
          <span className="ml-2 text-[26px] text-ink-subtle">
            {deviceLabel}
          </span>
        )}
        <LiveClock now={serverTime} ticking className="ml-auto text-[32px]" />
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
        <h1 className="text-[72px] leading-tight font-extrabold text-ink">
          지금 게시 중인 안내가 없습니다
        </h1>
        <p className="text-[32px] text-ink-muted">
          게시 신청은 Ziggle 공지에서 할 수 있어요 · {ZIGGLE_HOST}
        </p>
      </div>
    </div>
  );
}

/**
 * 기기가 연결되지 않았을 때. 설치하는 사람이 TV 앞에서 읽는다. 무엇을 하면 되는지와
 * 관리자에게 알려 줄 기기 ID를 크게 보여준다. 토큰 값은 절대 보여주지 않는다.
 */
function DeviceSetupNotice({
  error,
  deviceId,
}: {
  error: ApiError;
  deviceId: string;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 text-center">
      <Logo size="tv" />
      <h1 className="text-[64px] leading-tight font-extrabold text-ink">
        {error.code === "DEVICE_UNAUTHORIZED"
          ? "이 TV의 연결이 끊겼어요"
          : "이 TV는 아직 연결되지 않았어요"}
      </h1>
      <p className="max-w-[1200px] text-[32px] leading-normal text-ink-muted">
        {toUserMessage(error)}
      </p>
      <p className="text-[26px] text-ink-subtle">기기 ID · {deviceId}</p>
    </div>
  );
}

/** 정보줄 "다음 · ○○"에 쓸 이름. 위젯 자리는 그때 고를 위젯을 미리 본다. */
function frameLabel(
  template: FrameTemplate,
  posters: readonly { title: string }[],
  peek: () => { slot: WidgetSlot } | null,
): string {
  switch (template.kind) {
    case "spotlight":
      return template.poster.title;
    case "strip":
      return posters[template.focusIndex]?.title ?? "포스터";
    case "wall":
      return "모아 보기";
    case "widget-slot": {
      const pick = peek();
      return pick ? WIDGET_LABELS[pick.slot.type] : "포스터";
    }
  }
}
