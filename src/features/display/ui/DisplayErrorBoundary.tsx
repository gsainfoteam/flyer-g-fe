import { Component } from "react";
import type { ReactNode } from "react";
import { Logo } from "@/shared/components/Logo";
import { LiveClock } from "@/shared/components/LiveClock";
import { ScaledStage } from "@/entities/poster/ui/ScaledStage";
import { ZIGGLE_HOST } from "@/shared/lib/ziggle-url";

/**
 * 플레이어 런타임 보호 (명세 FR-PLY-06, Phase 06 "런타임 안전성").
 *
 * kiosk에는 새로고침해 줄 사람이 없다. 렌더 오류가 나면 안전한 브랜드 화면을
 * 보여주고 일정 시간 뒤 스스로 복구를 시도한다.
 *
 * - 재시도 간격은 최근 실패가 많을수록 늘어나고 상한이 있다. 즉시 다시 던지는
 *   오류로 무한 remount 루프를 만들지 않기 위한 것이다.
 * - 실패 횟수는 최근 구간만 센다. 몇 주 전의 실패 때문에 오늘의 복구가 5분씩
 *   늦어지지 않게 한다.
 * - 짧은 시간에 여러 번 실패하면 remount가 아니라 페이지를 새로 받는다. remount는
 *   캐시와 모듈 상태를 그대로 두므로 같은 원인으로 다시 죽는다. 단, 오프라인이면
 *   새로 받을 수 없어 remount를 계속한다.
 *
 * stack·오류 내용은 공개 화면에 절대 그리지 않는다.
 */
const BASE_RETRY_MS = 30_000;
const MAX_RETRY_MS = 5 * 60_000;
/** 이 구간 안의 실패만 센다. */
const CRASH_WINDOW_MS = 30 * 60_000;
/** 구간 안에서 이만큼 실패하면 새로 받는다. */
const RELOAD_AFTER_CRASHES = 3;

interface DisplayErrorBoundaryProps {
  children: ReactNode;
  /** 테스트 주입용 */
  reload?: () => void;
  now?: () => number;
}

interface DisplayErrorBoundaryState {
  hasError: boolean;
}

export class DisplayErrorBoundary extends Component<
  DisplayErrorBoundaryProps,
  DisplayErrorBoundaryState
> {
  state: DisplayErrorBoundaryState = { hasError: false };

  private crashTimes: number[] = [];
  private retryTimer: number | null = null;

  static getDerivedStateFromError(): DisplayErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(): void {
    const now = (this.props.now ?? Date.now)();
    this.crashTimes = [
      ...this.crashTimes.filter((time) => now - time < CRASH_WINDOW_MS),
      now,
    ];
    const recentCrashes = this.crashTimes.length;
    const delay = Math.min(
      MAX_RETRY_MS,
      BASE_RETRY_MS * 2 ** (recentCrashes - 1),
    );
    const shouldReload =
      recentCrashes >= RELOAD_AFTER_CRASHES && navigator.onLine;

    if (this.retryTimer !== null) window.clearTimeout(this.retryTimer);
    this.retryTimer = window.setTimeout(() => {
      this.retryTimer = null;
      if (shouldReload) {
        (this.props.reload ?? (() => window.location.reload()))();
      } else {
        this.setState({ hasError: false });
      }
    }, delay);
  }

  componentWillUnmount(): void {
    if (this.retryTimer !== null) window.clearTimeout(this.retryTimer);
  }

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    return (
      <ScaledStage className="h-full w-full">
        <div className="flex h-full flex-col">
          <div className="flex items-center gap-4">
            <Logo size="tv" />
            <LiveClock ticking className="ml-auto text-[32px]" />
          </div>
          <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
            <h1 className="text-[72px] leading-tight font-extrabold text-ink">
              잠시 후 다시 시작합니다
            </h1>
            <p className="text-[32px] text-ink-muted">
              게시 신청은 Ziggle 공지에서 할 수 있어요 · {ZIGGLE_HOST}
            </p>
          </div>
        </div>
      </ScaledStage>
    );
  }
}
