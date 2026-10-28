import { useCallback, useMemo, useState } from "react";
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
import {
  DEFAULT_LAYOUT_TYPE,
  PREVIEW_DEVICE_ID,
} from "@/entities/playlist/model/types";
import { exposedPosters, imagesOf } from "@/entities/poster/model/frames";
import { buildWidgetContent } from "@/entities/widget/model/content";
import type { PlayerFrame } from "@/entities/widget/model/schedule";
import { WidgetDisplay } from "@/entities/widget/ui/WidgetDisplay";
import { toUserMessage } from "@/shared/api/error";
import type { ApiError } from "@/shared/api/error";
import { captureDeviceTokenFromUrl } from "@/shared/lib/device-credential";
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

  // 지금 보여 줄 내용이 있는 위젯만 돈다. 지난 D-day, 시험 기간이 아닌 응원은 빠진다.
  const widgets = useMemo(
    () =>
      serverTime
        ? (feed.playlist?.widgets ?? []).filter(
            (slot) => buildWidgetContent(slot, serverTime) !== null,
          )
        : [],
    [feed.playlist, serverTime],
  );

  const [paused, setPaused] = useState(false);
  const rotation = useRotation({
    posters,
    layout,
    rotationSeconds,
    widgets,
    paused: isPreview && paused,
  });

  const nextFrame = rotation.nextFrame;
  usePrefetchImages(
    nextFrame && nextFrame.kind !== "widget" ? imagesOf(nextFrame, posters) : [],
  );

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

  // 위젯 화면은 게시물 노출이 아니다. 노출 기록에서 뺀다.
  const exposed =
    rotation.currentFrame && rotation.currentFrame.kind !== "widget"
      ? exposedPosters(rotation.currentFrame, posters)
      : [];
  usePlaybackReporting({
    page: exposed,
    rendered:
      exposed.length > 0 &&
      exposed.every((poster) => loadedIds.has(poster.id)),
    rotationSeconds,
    recordExposure: telemetry.recordExposure,
    reportRenderOk: telemetry.reportRenderOk,
  });

  // 화면이 바뀔 때 새로 그려 부드럽게 나타나게 한다. 띠는 한 덩어리로 두고
  // 칸만 미끄러지게 한다.
  const frame = rotation.currentFrame;
  const frameKey = frame?.kind === "strip" ? "strip" : (frame?.key ?? "");

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
        ) : !frame ? (
          <EmptyDisplay deviceLabel={deviceLabel} serverTime={serverTime} />
        ) : frame.kind === "widget" ? (
          <WidgetFrame
            key={frameKey}
            frame={frame}
            deviceLabel={deviceLabel}
            serverTime={serverTime}
          />
        ) : (
          <div key={frameKey} className="h-full animate-in duration-500 fade-in">
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
      </ScaledStage>

      {isPreview && (
        <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-pill bg-ink/85 px-4 py-2 text-ink-inverse shadow-floating backdrop-blur">
          <span className="text-caption font-bold">미리보기</span>
          {feed.source === "cache" && (
            <span className="rounded-pill bg-white/15 px-2 py-0.5 text-caption">
              오프라인 편성
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
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
            size="sm"
            className="text-ink-inverse hover:bg-white/15 hover:text-ink-inverse"
            onClick={rotation.advance}
            disabled={rotation.frameCount <= 1}
            aria-label="다음 화면"
          >
            <SkipForward aria-hidden="true" />
          </Button>
          <span className="text-caption tabular-nums text-white/70">
            {rotation.frameIndex + 1} / {Math.max(rotation.frameCount, 1)}
          </span>
        </div>
      )}
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
  // 거르는 시점과 그리는 시점 사이에 날이 바뀌면 내용이 없을 수 있다. 다음 화면까지
  // 빈 칸 대신 안내 화면을 둔다.
  const content = buildWidgetContent(frame.slot, serverTime);
  if (!content) {
    return <EmptyDisplay deviceLabel={deviceLabel} serverTime={serverTime} />;
  }
  return (
    <div className="h-full animate-in duration-500 fade-in">
      <WidgetDisplay
        content={content}
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
