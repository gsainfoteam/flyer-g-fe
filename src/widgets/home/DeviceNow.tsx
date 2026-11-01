import { WifiOff } from "lucide-react";
import { Link } from "react-router";
import { LAYOUT_LABELS } from "@/entities/playlist/model/rotation";
import { isRenderStalled, isTargetedTo } from "@/entities/device/model/board";
import type { DisplayDevice } from "@/entities/device/model/types";
import type { SubmissionView } from "@/entities/submission/model/types";
import { to } from "@/shared/config/routes";
import { formatElapsed } from "@/shared/lib/datetime";
import { cn } from "@/shared/lib/utils";

/**
 * TV 지금 (기획 4-0 운영자). 기기마다 작은 TV 화면을 그린다.
 *
 * 지금 나오는 장면은 heartbeat `now`(배포 ⑦)부터 알 수 있다. 그 전에는 화면 방식과
 * 걸린 포스터 수를 보여 준다. 꺼진 TV는 회색 화면에 연결 없음 시간을 적는다.
 */
export function DeviceNow({
  devices,
  published,
  now,
}: {
  devices: DisplayDevice[];
  published: SubmissionView[];
  now: Date;
}) {
  const active = devices.filter((device) => device.status !== "DISABLED");
  const onCount = active.filter((device) => device.status === "ONLINE").length;

  return (
    <section
      aria-labelledby="device-now"
      className="rounded-block bg-surface px-6 py-5.5 ring-1 ring-line"
    >
      <div className="flex items-center gap-2">
        <span aria-hidden="true" className="size-2 rounded-full bg-accent" />
        <h2 id="device-now" className="text-subhead text-ink">
          TV 지금
        </h2>
        <span className="text-caption text-ink-subtle">
          {onCount}/{active.length} 켜짐
        </span>
        <Link
          to={to.tv()}
          className="ml-auto text-label font-semibold text-ink hover:underline"
        >
          모두 보기
        </Link>
      </div>
      {active.length === 0 ? (
        <p className="mt-3 text-label text-ink-muted">등록한 TV 없음</p>
      ) : (
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(180px,1fr))] sm:gap-3.5">
          {active.map((device) => {
            const posters = published.filter((item) =>
              isTargetedTo(device, item.targetGroupIds),
            ).length;
            const on = device.status === "ONLINE";
            const stalled = isRenderStalled(device, now, posters > 0);
            return (
              <li key={device.id}>
                <div
                  className={cn(
                    "relative flex aspect-video items-center justify-center rounded-tile",
                    on
                      ? "bg-stage ring-1 ring-zinc-800 ring-inset"
                      : "bg-surface-muted ring-1 ring-line ring-inset",
                  )}
                >
                  {on ? (
                    <div className="flex flex-col items-center gap-1.5">
                      <span className="inline-flex h-5 items-center rounded-pill bg-type-poster-bar px-2 text-overline font-extrabold text-white">
                        {LAYOUT_LABELS[device.layout.type]}
                      </span>
                      <span className="text-label font-extrabold text-hero-ink">
                        포스터 {posters}장
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-ink-subtle">
                      <WifiOff size={20} aria-hidden="true" />
                      <span className="text-overline font-normal">
                        {device.lastSeenAt
                          ? `${formatElapsed(device.lastSeenAt, now)}째 연결 없음`
                          : "연결 기록 없음"}
                      </span>
                    </div>
                  )}
                  {stalled && (
                    <span className="absolute top-2 left-2 inline-flex h-5 items-center rounded-pill bg-accent px-1.75 text-overline font-extrabold text-accent-on">
                      재생 멈춤
                    </span>
                  )}
                </div>
                <p className="mt-2 flex items-center gap-1.5 text-label font-bold text-ink">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "size-2 rounded-full",
                      on && !stalled ? "bg-success" : "bg-accent",
                    )}
                  />
                  {device.name}
                  <span className="sr-only">
                    {on ? (stalled ? " 재생 멈춤" : " 켜짐") : " 꺼짐"}
                  </span>
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
