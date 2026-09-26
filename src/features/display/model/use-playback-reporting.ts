import { useEffect, useRef } from "react";
import type { PosterRenderModel } from "@/entities/poster";
import type { ExposureInput } from "@/features/display/model/use-device-telemetry";

/**
 * 화면에 실제로 보인 것을 기록한다 (명세 FR-DASH-03, FR-PLY-08).
 *
 * 한 "노출"은 한 페이지가 전환 간격 한 번만큼 보인 것이다. 페이지가 바뀌면 앞
 * 페이지를 기록하고, 페이지가 하나뿐이라 바뀌지 않아도 전환 간격마다 끊어서
 * 기록한다. 그러지 않으면 포스터가 한 장인 TV는 노출이 0건이 된다.
 *
 * 이미지가 뜨지 않은 페이지는 기록하지 않는다. 정상 렌더링 시각(heartbeat의
 * `lastRenderOkAt`)도 이미지가 실제로 뜬 페이지에서만 갱신한다.
 */
interface UsePlaybackReportingOptions {
  page: PosterRenderModel[];
  /** 지금 페이지의 이미지가 모두 떴는가 */
  rendered: boolean;
  rotationSeconds: number;
  recordExposure: (exposure: ExposureInput) => void;
  reportRenderOk: () => void;
}

export function usePlaybackReporting({
  page,
  rendered,
  rotationSeconds,
  recordExposure,
  reportRenderOk,
}: UsePlaybackReportingOptions) {
  const pageKey = page.map((poster) => poster.id).join("|");

  // 콜백과 값은 ref로 읽는다. 바뀔 때마다 기록 구간을 새로 열면 안 된다.
  const latest = useRef({ page, rendered, recordExposure, reportRenderOk });
  useEffect(() => {
    latest.current = { page, rendered, recordExposure, reportRenderOk };
  });

  useEffect(() => {
    if (rendered) reportRenderOk();
  }, [pageKey, rendered, reportRenderOk]);

  useEffect(() => {
    if (!pageKey) return;
    const windowMs = rotationSeconds * 1000;
    let shownAt = Date.now();

    const close = () => {
      const { page: shown, rendered: ok, recordExposure: record } = latest.current;
      const durationMs = Date.now() - shownAt;
      shownAt = Date.now();
      if (!ok || durationMs <= 0) return;
      for (const poster of shown) {
        record({
          submissionId: poster.id,
          revision: poster.revision ?? null,
          startedAt: new Date(Date.now() - durationMs),
          durationMs,
          completed: durationMs >= windowMs * 0.9,
        });
      }
    };

    // 같은 페이지가 계속 보이면 전환 간격마다 끊는다.
    const id = window.setInterval(() => {
      close();
      if (latest.current.rendered) latest.current.reportRenderOk();
    }, windowMs);

    return () => {
      window.clearInterval(id);
      close();
    };
  }, [pageKey, rotationSeconds]);
}
