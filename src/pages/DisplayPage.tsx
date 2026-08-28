import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router";
import {
  DisplayStage,
  TV_STAGE_PADDING,
} from "@/components/display/DisplayStage";
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

  return (
    <div
      className="h-full overflow-hidden"
      style={{ padding: TV_STAGE_PADDING }}
    >
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
        <DisplayStage
          layout={layout}
          posters={posters}
          currentIndex={currentIndex}
          deviceLabel={deviceLabel}
          serverTime={serverTime}
        />
      </PageState>
    </div>
  );
}
