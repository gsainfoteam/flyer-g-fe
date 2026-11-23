import { Moon, PowerOff, WifiOff } from "lucide-react";
import type { ReactNode } from "react";
import { isRenderStalled } from "@/entities/device/model/board";
import type { DisplayDevice } from "@/entities/device/model/types";
import { LAYOUT_LABELS } from "@/entities/playlist/model/rotation";
import { formatElapsed } from "@/shared/lib/datetime";
import { cn } from "@/shared/lib/utils";

/**
 * TV 한 대의 작은 화면. 운영자 홈과 TV 관리 화면이 같이 쓴다.
 *
 * 밝은 틀에 그린다. 지금 나오는 장면은 heartbeat `now`(배포 ⑦)부터 알 수 있어서, 그
 * 전에는 화면 방식과 걸린 포스터 수를 글과 회색 칸으로 보여 준다.
 * - 켜짐: 옅은 회색 화면에 포스터 칸
 * - 꺼짐: 옅은 빨강 화면에 연결 없음 시간과, 넘겨받으면 바로 가는 행동(`action`)
 * - 화면 끔·사용 안 함: 회색
 */
const WALL_TILES = 16;

export function DeviceScreen({
  device,
  posters,
  now,
  action,
  className,
}: {
  device: DisplayDevice;
  /** 이 기기에 걸린 게시 중 포스터 수 */
  posters: number;
  now: Date;
  /** 꺼진 TV 화면 안에 둘 행동. 예: 기기 보기 */
  action?: ReactNode;
  className?: string;
}) {
  const on = device.status === "ONLINE";
  const offline = device.status === "OFFLINE";
  const stalled = isRenderStalled(device, now, posters > 0);

  return (
    <div
      className={cn(
        "relative flex aspect-video flex-col rounded-tile ring-1 ring-inset",
        offline ? "bg-danger-subtle ring-accent-200" : "bg-surface-muted ring-line",
        className,
      )}
    >
      {on ? (
        <div className="flex min-h-0 flex-1 flex-col gap-2 px-[6%] py-[5%]">
          <p className="flex items-center gap-1.5 text-overline text-ink-subtle">
            <span aria-hidden="true" className="size-2 rounded-[2px] bg-accent" />
            {LAYOUT_LABELS[device.layout.type]} · 포스터 {posters}장
          </p>
          {posters > 0 ? (
            <div
              aria-hidden="true"
              className="grid flex-1 grid-cols-8 content-center gap-1"
            >
              {Array.from({ length: Math.min(posters, WALL_TILES) }, (_, i) => (
                <span
                  key={i}
                  className={cn(
                    "aspect-3/4 rounded-[3px]",
                    i % 3 === 1 ? "bg-zinc-400" : i % 3 === 2 ? "bg-zinc-200" : "bg-zinc-300",
                  )}
                />
              ))}
            </div>
          ) : (
            <p className="flex flex-1 items-center justify-center text-label text-ink-subtle">
              걸린 포스터 없음
            </p>
          )}
        </div>
      ) : offline ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-1.5 text-accent-700">
          <WifiOff size={20} aria-hidden="true" />
          <span className="text-label font-bold">
            {device.lastSeenAt
              ? `${formatElapsed(device.lastSeenAt, now)}째 연결 없음`
              : "연결 기록 없음"}
          </span>
          {action && <div className="mt-1">{action}</div>}
        </div>
      ) : device.status === "SLEEPING" ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-1 text-ink-subtle">
          <Moon size={20} aria-hidden="true" />
          <span className="text-label">화면 끔</span>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-1 text-ink-subtle">
          <PowerOff size={20} aria-hidden="true" />
          <span className="text-label">사용 안 함</span>
        </div>
      )}
      {stalled && (
        <span className="absolute top-2 right-2 inline-flex h-5 items-center rounded-pill bg-accent px-1.75 text-overline font-extrabold text-accent-on">
          재생 멈춤
        </span>
      )}
    </div>
  );
}
