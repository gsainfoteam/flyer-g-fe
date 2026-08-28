import { useMemo, useState } from "react";
import { Pause, Play, SkipForward } from "lucide-react";
import { useParams, useSearchParams } from "react-router";
import {
  DisplayStage,
  TV_STAGE_PADDING,
} from "@/components/display/DisplayStage";
import { Logo } from "@/components/common/Logo";
import { LiveClock } from "@/components/display/LiveClock";
import { useDisplayPlaylist } from "@/features/display/api/queries";
import { useRotation } from "@/features/display/model/use-rotation";
import { LoadingState } from "@/shared/components";
import { Button } from "@/shared/ui/button";

/**
 * TV 플레이어 (명세 FR-PLY-01 ~ FR-PLY-06).
 *
 * 운영 모드에는 조작 UI가 없다. 시청자는 지나가며 보고, 기기는 사람이 만지지
 * 않는다. `?preview=1`일 때만 관리자용 컨트롤(일시정지·다음)을 보여준다.
 *
 * 실패 격리:
 * - 이미지를 못 불러온 항목은 건너뛰고 재생을 계속한다.
 * - 편성 갱신이 실패해도 마지막 편성을 계속 재생한다.
 * - 유효 콘텐츠가 없으면 검은 화면 대신 브랜드·시각·안내를 보여준다.
 *
 * 사용자 로그인을 요구하지 않는다. 기기 자격 증명 경계는
 * `features/display/api/device-credential.ts`에 있다. (명세 3.1)
 */
const DEVICE_LABELS: Record<string, string> = {
  "device-preview": "학사기숙사 A동 로비",
};

export function DisplayPage() {
  const { deviceId = "device-preview" } = useParams();
  const [searchParams] = useSearchParams();
  const isPreview = searchParams.get("preview") === "1";
  const deviceLabel = DEVICE_LABELS[deviceId] ?? "학사기숙사";

  const playlist = useDisplayPlaylist(deviceId);

  // 이미지를 못 불러온 항목은 다음 편성 갱신 전까지 제외한다. (명세 FR-PLY-06)
  const [failedIds, setFailedIds] = useState<ReadonlySet<string>>(new Set());
  const posters = useMemo(
    () =>
      (playlist.data?.posters ?? []).filter(
        (poster) => !failedIds.has(poster.id),
      ),
    [playlist.data, failedIds],
  );

  const layout = playlist.data?.layout.type ?? "SINGLE";
  const serverTime = playlist.data?.serverTime ?? new Date();

  const [paused, setPaused] = useState(false);
  const rotation = useRotation({
    posters,
    layout,
    rotationSeconds: playlist.data?.layout.rotationSeconds ?? 10,
    paused: isPreview && paused,
  });

  const handlePosterError = (posterId: string) => {
    setFailedIds((current) => new Set(current).add(posterId));
  };

  // 첫 로딩만 로딩 화면을 쓴다. 갱신 실패는 마지막 편성으로 계속 재생한다.
  if (playlist.isPending) {
    return (
      <div className="h-full" style={{ padding: TV_STAGE_PADDING }}>
        <LoadingState rows={3} label="편성을 불러오는 중입니다." />
      </div>
    );
  }

  return (
    <div
      className="relative h-full overflow-hidden"
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
      <div className="flex flex-1 flex-col items-start justify-center gap-6">
        <h1 className="text-[72px] leading-tight font-extrabold text-ink">
          지금 게시 중인
          <br />
          안내가 없습니다
        </h1>
        <p className="text-[32px] text-ink-muted">
          게시 신청은 Ziggle 공지에서 할 수 있어요 · ziggle.gistory.me
        </p>
      </div>
    </div>
  );
}
