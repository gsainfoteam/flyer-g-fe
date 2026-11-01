import { CheckCheck, Tv } from "lucide-react";
import { SUBMISSION_KINDS } from "@/entities/submission/model/kind";
import { KIND_STYLE } from "@/entities/submission/ui/kind-style";
import { TypeBadge } from "@/entities/submission/ui/TypeBadge";
import { TypeIcon } from "@/entities/submission/ui/TypeIcon";
import { HeroPanel, Kbd, ProgressSplit, StatTile } from "@/shared/components";

/** 역할별 첫 화면의 시각 언어(Phase 09). 종류 색, 아이콘 사각형, 강조 카드. */
export function VisualLanguageGallery() {
  return (
    <div className="flex flex-col gap-6 py-4">
      <div className="flex flex-wrap items-center gap-3">
        {SUBMISSION_KINDS.map((kind) => (
          <span key={kind} className="inline-flex items-center gap-2">
            <TypeIcon kind={kind} size="sm" />
            <TypeIcon kind={kind} />
            <TypeIcon kind={kind} size="lg" />
            <TypeBadge kind={kind} />
          </span>
        ))}
      </div>
      <div className="grid max-w-md grid-cols-2 gap-3">
        <StatTile
          icon={CheckCheck}
          tone="bg-success-subtle text-success-strong"
          value={9}
          label="오늘 처리"
        />
        <StatTile
          icon={Tv}
          tone="bg-danger-subtle text-accent-700"
          value={4}
          unit="/5"
          label="TV 켜짐 · B동 꺼짐"
        />
      </div>
      <HeroPanel className="max-w-xl">
        <p className="text-label font-bold text-hero-muted">심사 대기</p>
        <p className="text-[4.5rem] leading-none font-black tracking-[-0.05em]">
          14<span className="ml-1 text-[1.75rem] font-bold tracking-normal">건</span>
        </p>
        <ProgressSplit
          thick
          className="mt-6"
          parts={[
            { key: "p", label: "포스터", value: 6, barClass: KIND_STYLE.POSTER.bar },
            { key: "e", label: "이벤트", value: 3, barClass: KIND_STYLE.EVENT_BANNER.bar },
            { key: "s", label: "제보", value: 5, barClass: KIND_STYLE.STORY.bar },
          ]}
        />
      </HeroPanel>
      <p className="flex items-center gap-1.5 text-label text-ink-muted">
        <Kbd>J</Kbd>
        <Kbd>K</Kbd> 이동 · <Kbd>A</Kbd> 승인 · <Kbd>R</Kbd> 반려
      </p>
    </div>
  );
}
