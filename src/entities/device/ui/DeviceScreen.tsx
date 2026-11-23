import { Moon, PowerOff, WifiOff } from "lucide-react";
import { isRenderStalled } from "@/entities/device/model/board";
import type { DisplayDevice } from "@/entities/device/model/types";
import { LAYOUT_LABELS } from "@/entities/playlist/model/rotation";
import { formatElapsed } from "@/shared/lib/datetime";
import { cn } from "@/shared/lib/utils";

/**
 * TV 한 대의 작은 화면. 운영자 홈 "TV 지금"과 TV 관리 화면이 같이 쓴다.
 *
 * 지금 나오는 장면은 heartbeat `now`(배포 ⑦)부터 알 수 있다. 그 전에는 화면 방식과
 * 걸린 포스터 수를 보여 준다.
 * - 켜짐: 어두운 TV 화면
 * - 꺼짐: 빨간 화면에 연결 없음 시간
 * - 화면 끔: 정해 둔 대로 쉬는 것이라 회색
 * - 사용 안 함: 회색
 */
export function DeviceScreen({
  device,
  posters,
  now,
  className,
}: {
  device: DisplayDevice;
  /** 이 기기에 걸린 게시 중 포스터 수 */
  posters: number;
  now: Date;
  className?: string;
}) {
  const on = device.status === "ONLINE";
  const offline = device.status === "OFFLINE";
  const stalled = isRenderStalled(device, now, posters > 0);

  return (
    <div
      className={cn(
        "relative flex aspect-video items-center justify-center rounded-tile ring-1 ring-inset",
        on
          ? "bg-stage ring-zinc-800"
          : offline
            ? "bg-danger-subtle ring-accent-300"
            : "bg-surface-muted ring-line",
        className,
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
      ) : offline ? (
        <div className="flex flex-col items-center gap-1 text-accent-700">
          <WifiOff size={20} aria-hidden="true" />
          <span className="text-overline font-bold">
            {device.lastSeenAt
              ? `${formatElapsed(device.lastSeenAt, now)}째 연결 없음`
              : "연결 기록 없음"}
          </span>
        </div>
      ) : device.status === "SLEEPING" ? (
        <div className="flex flex-col items-center gap-1 text-ink-subtle">
          <Moon size={20} aria-hidden="true" />
          <span className="text-overline font-normal">화면 끔</span>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-1 text-ink-subtle">
          <PowerOff size={20} aria-hidden="true" />
          <span className="text-overline font-normal">사용 안 함</span>
        </div>
      )}
      {stalled && (
        <span className="absolute top-2 left-2 inline-flex h-5 items-center rounded-pill bg-accent px-1.75 text-overline font-extrabold text-accent-on">
          재생 멈춤
        </span>
      )}
    </div>
  );
}
