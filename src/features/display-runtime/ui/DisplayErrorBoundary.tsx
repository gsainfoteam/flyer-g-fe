import { Component } from "react";
import type { ReactNode } from "react";
import { Logo } from "@/components/common/Logo";
import { LiveClock } from "@/components/display/LiveClock";

/**
 * 플레이어 런타임 보호 (명세 FR-PLY-06, Phase 06 "런타임 안전성").
 *
 * kiosk에는 새로고침해 줄 사람이 없다. 렌더 오류가 나면 안전한 브랜드 화면을
 * 보여주고 일정 시간 뒤 스스로 복구를 시도한다.
 *
 * 재시도 간격은 실패가 반복될수록 늘어나고 상한이 있다. 즉시 다시 던지는 오류로
 * 무한 remount 루프를 만들지 않기 위한 것이다. stack·오류 내용은 공개 화면에
 * 절대 그리지 않는다.
 */
const BASE_RETRY_MS = 30_000;
const MAX_RETRY_MS = 5 * 60_000;

interface DisplayErrorBoundaryProps {
  children: ReactNode;
}

interface DisplayErrorBoundaryState {
  hasError: boolean;
}

export class DisplayErrorBoundary extends Component<
  DisplayErrorBoundaryProps,
  DisplayErrorBoundaryState
> {
  state: DisplayErrorBoundaryState = { hasError: false };

  private crashCount = 0;
  private retryTimer: number | null = null;

  static getDerivedStateFromError(): DisplayErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(): void {
    this.crashCount += 1;
    const delay = Math.min(
      MAX_RETRY_MS,
      BASE_RETRY_MS * 2 ** (this.crashCount - 1),
    );
    this.retryTimer = window.setTimeout(() => {
      this.setState({ hasError: false });
    }, delay);
  }

  componentWillUnmount(): void {
    if (this.retryTimer !== null) window.clearTimeout(this.retryTimer);
  }

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex h-full flex-col p-[80px]">
        <div className="flex items-center gap-4">
          <Logo size="tv" />
          <LiveClock ticking className="ml-auto text-[32px]" />
        </div>
        <div className="flex flex-1 flex-col items-start justify-center gap-6">
          <h1 className="text-[72px] leading-tight font-extrabold text-ink">
            잠시 후 다시 시작합니다
          </h1>
          <p className="text-[32px] text-ink-muted">
            게시 신청은 Ziggle 공지에서 할 수 있어요 · ziggle.gistory.me
          </p>
        </div>
      </div>
    );
  }
}
