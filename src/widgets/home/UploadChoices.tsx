import { ArrowRight, Clock } from "lucide-react";
import { Link } from "react-router";
import { KIND_INFO, SUBMISSION_KINDS } from "@/entities/submission/model/kind";
import type { SubmissionKind } from "@/entities/submission/model/kind";
import { KIND_STYLE } from "@/entities/submission/ui/kind-style";
import { TypeIcon } from "@/entities/submission/ui/TypeIcon";
import { to } from "@/shared/config/routes";
import { cn } from "@/shared/lib/utils";

/**
 * "무엇을 올릴까요?" 세 종류. 사용자 홈 맨 위에 둔다. (기획 4-0, 4-1)
 *
 * 이벤트 배너와 소식 제보는 9.2에서 열린다. 그 전에는 카드를 보여 주되 누를 수 없게
 * 두고 "곧 열려요"라고 적는다.
 */
interface KindCopy {
  description: string;
  examples: string[];
  /** 게시 기간 규칙 */
  rule: string;
  href: string | null;
}

const COPY: Record<SubmissionKind, KindCopy> = {
  POSTER: {
    description: "이미지를 올리고 기간과 QR 링크를 정해요",
    examples: ["동아리 신입 모집", "공연·행사 안내"],
    rule: "기간 직접 정함",
    href: to.newPoster(),
  },
  EVENT_BANNER: {
    description: "받는 사람과 문구만 쓰면 TV 화면이 만들어져요",
    examples: ["친구 생일", "합격·수상 소식"],
    rule: "하루~3일",
    href: null,
  },
  STORY: {
    description: "140자 안으로 쓰면 이름 없이 TV에 나가요",
    examples: ["고쳐진 시설", "분실물", "건의"],
    rule: "2일 게시 · 이름 비공개",
    href: null,
  },
};

/** 첫 방문: 그림이 있는 큰 카드 */
export function UploadChoicesLarge() {
  return (
    <div className="grid gap-5 md:grid-cols-3">
      {SUBMISSION_KINDS.map((kind) => (
        <ChoiceCard key={kind} kind={kind} large />
      ))}
    </div>
  );
}

/** 다시 온 사람: 한 줄 설명과 규칙만 있는 작은 카드 */
export function UploadChoicesCompact() {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {SUBMISSION_KINDS.map((kind) => (
        <ChoiceCard key={kind} kind={kind} />
      ))}
    </div>
  );
}

function ChoiceCard({ kind, large = false }: { kind: SubmissionKind; large?: boolean }) {
  const copy = COPY[kind];
  const style = KIND_STYLE[kind];
  const ready = copy.href !== null;

  const body = (
    <>
      {large && (
        <div
          className={cn(
            "flex h-28 items-end px-6 pb-5",
            style.tint,
          )}
        >
          <TypeIcon kind={kind} size="lg" className="bg-surface" />
        </div>
      )}
      <div
        className={cn(
          "flex flex-1 flex-col",
          large ? "px-6 pt-5 pb-6" : "gap-0.5 p-5",
        )}
      >
        <div className="flex items-center gap-3">
          {!large && <TypeIcon kind={kind} size="sm" />}
          {/* 홈의 제목(h1) 바로 아래 묶음이라 h2다. */}
          <h2
            className={cn(
              "font-extrabold tracking-[-0.02em] text-ink",
              large ? "text-[1.375rem]" : "text-subhead",
            )}
          >
            {KIND_INFO[kind].name}
          </h2>
        </div>
        <p className={cn("text-ink-muted", large ? "mt-1.5 text-body" : "mt-1.5 text-label")}>
          {copy.description}
        </p>
        {large && (
          <ul className="mt-3.5 flex flex-wrap gap-1.5">
            {copy.examples.map((example) => (
              <li
                key={example}
                className="inline-flex h-7 items-center rounded-pill bg-surface-muted px-2.5 text-caption text-ink"
              >
                {example}
              </li>
            ))}
          </ul>
        )}
        <div
          className={cn(
            "mt-auto flex items-center gap-1.5 text-caption text-ink-subtle",
            large ? "pt-5" : "pt-3",
          )}
        >
          <Clock size={14} aria-hidden="true" />
          {copy.rule}
          {ready ? (
            <span
              aria-hidden="true"
              className={cn(
                "ml-auto inline-flex size-9 items-center justify-center rounded-full",
                style.solid,
              )}
            >
              <ArrowRight size={18} strokeWidth={2.5} />
            </span>
          ) : (
            <span className="ml-auto inline-flex h-7 items-center rounded-pill bg-surface-muted px-2.5 font-semibold text-ink-muted">
              곧 열려요
            </span>
          )}
        </div>
      </div>
    </>
  );

  const frame = cn(
    "flex min-w-0 flex-col overflow-hidden bg-surface ring-1 ring-line",
    large ? "rounded-block shadow-card" : "rounded-card",
  );

  if (!ready) {
    return (
      <div className={cn(frame, "opacity-75")} aria-disabled="true">
        {body}
      </div>
    );
  }
  return (
    <Link
      to={copy.href!}
      className={cn(
        frame,
        "transition-shadow hover:ring-line-strong hover:shadow-floating focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
      )}
    >
      {body}
    </Link>
  );
}
