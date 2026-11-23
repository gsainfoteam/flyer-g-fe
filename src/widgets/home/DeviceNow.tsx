import { Link } from "react-router";
import { isRenderStalled, isTargetedTo } from "@/entities/device/model/board";
import type { DisplayDevice } from "@/entities/device/model/types";
import { DeviceScreen } from "@/entities/device/ui/DeviceScreen";
import type { SubmissionView } from "@/entities/submission/model/types";
import { to } from "@/shared/config/routes";
import { cn } from "@/shared/lib/utils";

/**
 * TV 지금 (기획 4-0 운영자). 기기마다 작은 TV 화면(`DeviceScreen`)을 그린다. TV 관리
 * 화면과 같은 모양이다.
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
  const sleepingCount = active.filter(
    (device) => device.status === "SLEEPING",
  ).length;

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
          {sleepingCount > 0 && ` · 화면 끔 ${sleepingCount}`}
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
            const sleeping = device.status === "SLEEPING";
            const stalled = isRenderStalled(device, now, posters > 0);
            return (
              <li key={device.id}>
                <DeviceScreen device={device} posters={posters} now={now} />
                <p className="mt-2 flex items-center gap-1.5 text-label font-bold text-ink">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "size-2 rounded-full",
                      sleeping
                        ? "bg-info"
                        : on && !stalled
                          ? "bg-success"
                          : "bg-accent",
                    )}
                  />
                  {device.name}
                  <span className="sr-only">
                    {sleeping
                      ? " 화면 끔"
                      : on
                        ? stalled
                          ? " 재생 멈춤"
                          : " 켜짐"
                        : " 꺼짐"}
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
