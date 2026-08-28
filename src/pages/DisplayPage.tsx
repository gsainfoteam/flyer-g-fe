import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, SkipForward } from "lucide-react";
import { useParams, useSearchParams } from "react-router";
import {
  DisplayStage,
  TV_STAGE_PADDING,
} from "@/components/display/DisplayStage";
import { Logo } from "@/components/common/Logo";
import { LiveClock } from "@/components/display/LiveClock";
import {
  useDeviceTelemetry,
  useOfflinePlaylist,
} from "@/features/display-runtime";
import { useRotation } from "@/features/display/model/use-rotation";
import { computeBackoffMs } from "@/shared/network/backoff";
import { cn } from "@/shared/lib/utils";
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
 * - 이미지 실패 → 항목 건너뛰고 계속
 * - 아무것도 없음 → 브랜드·시각·안내 fallback
 *
 * 상태 보고(heartbeat)와 노출 이벤트는 실패해도 재생을 멈추지 않는다.
 */
const DEVICE_LABELS: Record<string, string> = {
  "device-preview": "학사기숙사 A동 로비",
};

export function DisplayPage() {
  const { deviceId = "device-preview" } = useParams();
  const [searchParams] = useSearchParams();
  const isPreview = searchParams.get("preview") === "1";
  const deviceLabel = DEVICE_LABELS[deviceId] ?? "학사기숙사";

  const feed = useOfflinePlaylist(deviceId, {
    refetchIntervalMs: (base, failureCount) =>
      computeBackoffMs(base, failureCount),
  });

  const telemetry = useDeviceTelemetry(
    deviceId,
    feed.playlist?.playlistVersion ?? null,
    { enabled: !isPreview },
  );

  // 이미지를 못 불러온 항목은 다음 편성 갱신 전까지 제외한다. (명세 FR-PLY-06)
  const [failedIds, setFailedIds] = useState<ReadonlySet<string>>(new Set());
  const posters = useMemo(
    () =>
      (feed.playlist?.posters ?? []).filter(
        (poster) => !failedIds.has(poster.id),
      ),
    [feed.playlist, failedIds],
  );

  const layout = feed.playlist?.layout.type ?? "SINGLE";
  const rotationSeconds = feed.playlist?.layout.rotationSeconds ?? 10;
  const serverTime = feed.playlist?.serverTime ?? new Date();

  const [paused, setPaused] = useState(false);
  const rotation = useRotation({
    posters,
    layout,
    rotationSeconds,
    paused: isPreview && paused,
  });

  // 화면에 실제로 그려진 페이지를 노출 이벤트로 기록한다. (명세 FR-DASH-03)
  const shownRef = useRef<{ ids: string[]; shownAt: number } | null>(null);
  const pageKey = rotation.currentPage.map((poster) => poster.id).join("|");
  useEffect(() => {
    const flush = () => {
      const shown = shownRef.current;
      if (!shown || shown.ids.length === 0) return;
      const durationMs = Date.now() - shown.shownAt;
      for (const submissionId of shown.ids) {
        telemetry.recordExposure({
          submissionId,
          startedAt: new Date(shown.shownAt),
          durationMs,
          completed: durationMs >= rotationSeconds * 1000 * 0.9,
        });
      }
    };

    flush();
    shownRef.current = {
      ids: pageKey ? pageKey.split("|") : [],
      shownAt: Date.now(),
    };
    if (pageKey) telemetry.reportRenderOk();

    return flush;
    // pageKey가 페이지 내용의 identity다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageKey, rotationSeconds]);

  const handlePosterError = (posterId: string) => {
    setFailedIds((current) => new Set(current).add(posterId));
  };

  if (feed.isPending) {
    return (
      <div
        className="flex h-full flex-col items-center justify-center gap-6"
        style={{ padding: TV_STAGE_PADDING }}
      >
        <Logo size="tv" />
        <p className="text-[30px] text-ink-subtle">편성을 불러오는 중</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative h-full overflow-hidden select-none",
        !isPreview && "cursor-none",
      )}
      style={{ padding: TV_STAGE_PADDING }}
    >
      {posters.length === 0 ? (
        <EmptyDisplay deviceLabel={deviceLabel} serverTime={serverTime} />
      ) : (
        <DisplayStage
          layout={layout}
          posters={rotation.currentPage}
          deviceLabel={deviceLabel}
          serverTime={serverTime}
          clockTicking
          onPosterError={handlePosterError}
        />
      )}

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
  deviceLabel: string;
  serverTime: Date;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-4">
        <Logo size="tv" />
        <span className="ml-2 text-[26px] text-ink-subtle">{deviceLabel}</span>
        <LiveClock now={serverTime} ticking className="ml-auto text-[32px]" />
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
        <h1 className="text-[72px] leading-tight font-extrabold text-ink">
          지금 게시 중인 안내가 없습니다
        </h1>
        <p className="text-[32px] text-ink-muted">
          게시 신청은 Ziggle 공지에서 할 수 있어요 · ziggle.gistory.me
        </p>
      </div>
    </div>
  );
}
