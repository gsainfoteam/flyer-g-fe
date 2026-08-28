import { Logo } from "../common/Logo";
import { APP_VERSION } from "@/shared/config/app-version";

/**
 * 화면 바닥의 안내. 이 서비스가 Ziggle의 연장이라는 점과, 표시 시각의 기준을 밝힌다.
 * 버전 표시는 기기 장애를 확인할 때 필요하다. (명세 9.7)
 */

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto flex max-w-content flex-wrap items-center gap-x-7 gap-y-3 px-6 py-5 lg:px-10">
        <Logo size="sm" />
        <p className="text-caption text-ink-subtle">
          GIST 학사기숙사 디지털 게시판 ·{" "}
          <a
            href="https://ziggle.gistory.me"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-accent-800 hover:text-accent"
          >
            Ziggle
          </a>
          의 연장 서비스
        </p>
        <p className="ml-auto text-caption tabular-nums text-ink-subtle">
          {APP_VERSION} · 표시 시각 Asia/Seoul
        </p>
      </div>
    </footer>
  );
}
