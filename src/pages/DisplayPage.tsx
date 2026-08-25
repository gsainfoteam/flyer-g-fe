import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router";
import { Logo } from "@/components/common/Logo";
import { FourSplitDisplay } from "@/components/display/FourSplitDisplay";
import { LiveClock } from "@/components/display/LiveClock";
import { SinglePosterDisplay } from "@/components/display/SinglePosterDisplay";
import { useDisplayPlaylist } from "@/features/display/api/queries";
import { PageState } from "@/shared/components";

/**
 * TV 플레이어.
 *
 * 조작 UI가 없다. 시청자는 지나가며 보고, 기기는 사람이 만지지 않는다. 레이아웃은
 * 서버 편성이 정한다.
 *
 * 사용자 로그인을 요구하지 않는다. 기기는 기기 전용 자격 증명으로 편성을 받으며,
 * 그 주입 방식은 Phase 05에서 adapter로 분리한다. (명세 3.1, FR-PLY-01)
 */
const DEVICE_LABELS: Record<string, string> = {
  "device-preview": "학사기숙사 A동 로비",
};

export function DisplayPage() {
  const { deviceId = "device-preview" } = useParams();
  const deviceLabel = DEVICE_LABELS[deviceId] ?? "학사기숙사";

  const playlist = useDisplayPlaylist(deviceId);
  const posters = useMemo(() => playlist.data?.posters ?? [], [playlist.data]);
  const layout = playlist.data?.layout.type ?? "SINGLE";
  const rotationMs = (playlist.data?.layout.rotationSeconds ?? 10) * 1000;
  const serverTime = playlist.data?.serverTime ?? new Date();

  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (layout !== "SINGLE" || posters.length <= 1) return;
    const id = window.setInterval(() => {
      setCurrentIndex((index) => (index + 1) % posters.length);
    }, rotationMs);
    return () => window.clearInterval(id);
  }, [layout, posters.length, rotationMs]);

  const current = posters[currentIndex % Math.max(posters.length, 1)];

  return (
    <div className="h-full overflow-hidden p-[80px]">
      <PageState
        isLoading={playlist.isPending}
        error={playlist.error}
        onRetry={() => void playlist.refetch()}
        isEmpty={posters.length === 0}
        empty={{
          title: "지금 게시 중인 안내가 없습니다",
          description: "게시 신청은 Ziggle 공지에서 할 수 있어요.",
        }}
      >
        {current && layout === "SINGLE" && (
          <SinglePosterDisplay
            poster={current}
            deviceLabel={deviceLabel}
            serverTime={serverTime}
          />
        )}
        {current && layout === "FOUR_GRID" && (
          <div className="flex h-full flex-col">
            <div className="flex shrink-0 items-center gap-4 pb-8">
              <Logo size="lg" />
              <span className="text-[26px] text-ink-subtle">
                {deviceLabel} · 게시 중 {posters.length}건
              </span>
              <LiveClock now={serverTime} className="ml-auto text-[30px]" />
            </div>
            <div className="min-h-0 flex-1">
              <FourSplitDisplay posters={posters} />
            </div>
          </div>
        )}
      </PageState>
    </div>
  );
}
