import { useCallback, useMemo, useState } from "react";
import { Pause, Play, SkipForward } from "lucide-react";
import { useParams, useSearchParams } from "react-router";
import { Logo } from "@/components/common/Logo";
import { DisplayStage } from "@/components/display/DisplayStage";
import { LiveClock } from "@/components/display/LiveClock";
import { ScaledStage } from "@/components/display/ScaledStage";
import {
  useDeviceTelemetry,
  useOfflinePlaylist,
  usePlaybackReporting,
  usePrefetchImages,
} from "@/features/display-runtime";
import { useRotation } from "@/features/display/model/use-rotation";
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
 */
export function DisplayPage() {
  const { deviceId = "device-preview" } = useParams();
  const [searchParams] = useSearchParams();
  const isPreview = searchParams.get("preview") === "1";

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

  const layout = feed.playlist?.layout.type ?? "SINGLE";
  const rotationSeconds = feed.playlist?.layout.rotationSeconds ?? 10;
  const serverTime = feed.playlist?.serverTime ?? null;

  const [paused, setPaused] = useState(false);
  const rotation = useRotation({
    posters,
    layout,
    rotationSeconds,
    paused: isPreview && paused,
  });

  const nextPage =
    rotation.pageCount > 1
      ? rotation.pages[(rotation.pageIndex + 1) % rotation.pageCount]
      : undefined;
  usePrefetchImages(nextPage?.map((poster) => poster.posterUrl) ?? []);

  // 실제로 그려진 이미지. 노출 기록과 정상 렌더링 보고는 뜬 페이지만 센다.
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

  usePlaybackReporting({
    page: rotation.currentPage,
    rendered:
      rotation.currentPage.length > 0 &&
      rotation.currentPage.every((poster) => loadedIds.has(poster.id)),
    rotationSeconds,
    recordExposure: telemetry.recordExposure,
    reportRenderOk: telemetry.reportRenderOk,
  });

  const pageKey = rotation.currentPage.map((poster) => poster.id).join("|");

  return (
    <div className="relative h-full">
      <ScaledStage className="h-full w-full">
        {feed.isPending || !serverTime ? (
          <div className="flex h-full flex-col items-center justify-center gap-6">
            <Logo size="tv" />
            <p className="text-[30px] text-ink-subtle">편성을 불러오는 중</p>
          </div>
        ) : posters.length === 0 ? (
          <EmptyDisplay deviceLabel={deviceLabel} serverTime={serverTime} />
        ) : (
          // 페이지가 바뀔 때 새로 그려 부드럽게 나타나게 한다.
          <div key={pageKey} className="h-full animate-in duration-500 fade-in">
            <DisplayStage
              layout={layout}
              posters={rotation.currentPage}
              totalCount={posters.length}
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
            {paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-ink-inverse hover:bg-white/15 hover:text-ink-inverse"
            onClick={rotation.advance}
            disabled={rotation.pageCount <= 1}
            aria-label="다음 페이지"
          >
            <SkipForward aria-hidden="true" />
          </Button>
          <span className="text-caption tabular-nums text-white/70">
            {rotation.pageIndex + 1} / {Math.max(rotation.pageCount, 1)}
          </span>
        </div>
      )}
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
          <span className="ml-2 text-[26px] text-ink-subtle">{deviceLabel}</span>
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
