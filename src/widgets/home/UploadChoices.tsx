import { ArrowRight, Clock } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { KIND_INFO, SUBMISSION_KINDS } from "@/entities/submission/model/kind";
import type { SubmissionKind } from "@/entities/submission/model/kind";
import { KIND_STYLE } from "@/entities/submission/ui/kind-style";
import { TypeIcon } from "@/entities/submission/ui/TypeIcon";
import { to } from "@/shared/config/routes";
import { cn } from "@/shared/lib/utils";

/**
 * "무엇을 TV에 올릴까요?" 세 종류. 게시자 홈의 주인공이다. (기획 4-0, 4-1)
 *
 * 카드 위쪽에 그 종류가 TV에 어떻게 나오는지 작은 그림을 둔다. 색은 그림 바탕에만
 * 옅게 쓰고 나머지는 차분하게 둔다. 좁은 화면에서는 그림이 왼쪽, 설명이 오른쪽인
 * 가로 카드로 쌓여 세 장이 첫 화면에 들어온다.
 *
 * 아직 열지 않은 종류는 카드를 보여 주되 누를 수 없게 두고 "준비 중"이라고 적는다
 * (`href`가 없다).
 */
interface KindCopy {
  description: string;
  /** 게시 기간 규칙 */
  rule: string;
  href: string | null;
}

const COPY: Record<SubmissionKind, KindCopy> = {
  POSTER: {
    description: "행사·모집 포스터를 그대로 띄워요",
    rule: "기간 직접 정함 · QR 링크",
    href: to.newPoster(),
  },
  EVENT_BANNER: {
    description: "생일·합격 축하를 문구로 만들어요",
    rule: "하루~3일 · 사진 1장",
    href: to.newEvent(),
  },
  STORY: {
    description: "기숙사 소식을 이름 없이 알려요",
    rule: "140자 · 승인 후 2일",
    href: to.newStory(),
  },
};

/** 게시자 홈: 그림이 있는 세 장 */
export function UploadChoices() {
  return (
    <ul className="grid gap-3 md:grid-cols-3 md:gap-4">
      {SUBMISSION_KINDS.map((kind) => (
        <li key={kind} className="flex">
          <ChoiceCard kind={kind} />
        </li>
      ))}
    </ul>
  );
}

function ChoiceCard({ kind }: { kind: SubmissionKind }) {
  const copy = COPY[kind];
  const style = KIND_STYLE[kind];
  const Icon = style.icon;
  const ready = copy.href !== null;

  const body = (
    <>
      <div
        aria-hidden="true"
        className={cn(
          "flex w-30 shrink-0 items-center justify-center p-3.5 md:w-auto md:px-6 md:py-5",
          style.tint,
        )}
      >
        <KindPreview kind={kind} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1 px-4 py-3.5 md:px-5 md:pt-4 md:pb-4.5">
        <div className="flex items-center gap-2">
          <Icon
            size={17}
            strokeWidth={2}
            aria-hidden="true"
            className={kindTextClass(kind)}
          />
          {/* 화면 제목(h1) 아래 묶음이라 h2다. */}
          <h2 className="text-[17px] font-extrabold tracking-[-0.02em] text-ink">
            {KIND_INFO[kind].name}
          </h2>
          {ready ? (
            <ArrowRight
              size={16}
              strokeWidth={2.25}
              aria-hidden="true"
              className="ml-auto hidden text-ink-subtle md:block"
            />
          ) : (
            <span className="ml-auto inline-flex h-6 items-center rounded-pill bg-surface-muted px-2 text-caption font-semibold text-ink-muted">
              준비 중
            </span>
          )}
        </div>
        <p className="text-label text-ink-muted">{copy.description}</p>
        <p className="flex items-center gap-1 text-caption text-ink-subtle">
          <Clock size={13} aria-hidden="true" />
          {copy.rule}
        </p>
      </div>
    </>
  );

  const frame =
    "flex w-full min-w-0 overflow-hidden rounded-card bg-surface ring-1 ring-line shadow-card md:flex-col";

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
        "transition-shadow hover:shadow-floating hover:ring-line-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
      )}
    >
      {body}
    </Link>
  );
}

function kindTextClass(kind: SubmissionKind): string {
  switch (kind) {
    case "POSTER":
      return "text-type-poster";
    case "EVENT_BANNER":
      return "text-type-event";
    case "STORY":
      return "text-type-story";
  }
}

/**
 * 그 종류가 TV에 나오는 모습을 줄인 그림. 꾸밈이라 보조기기에는 숨긴다(같은 내용은
 * 카드 설명에 있다). 좁은 화면에서는 칸이 작아 글 없이 모양만 남긴다.
 */
function KindPreview({ kind }: { kind: SubmissionKind }) {
  switch (kind) {
    case "POSTER":
      return (
        <Screen>
          <span className="flex h-full w-full items-center gap-3">
            <span className="flex aspect-3/4 h-full items-end rounded-[4px] bg-type-poster-bright p-1.5">
              <span className="h-1.5 w-3/4 rounded-[2px] bg-white" />
            </span>
            <span className="hidden flex-1 flex-col gap-1.5 md:flex">
              <span className="text-caption font-extrabold text-ink">
                동아리 신입 모집
              </span>
              <Bar className="w-4/5" />
              <Bar className="w-1/2" />
              <span className="mt-1 size-5 rounded-[3px] bg-line" />
            </span>
          </span>
        </Screen>
      );
    case "EVENT_BANNER":
      return (
        <Screen>
          <span className="flex h-full w-full items-center gap-2.5">
            <span className="flex flex-1 flex-col gap-1.5">
              <span className="inline-flex h-3.5 self-start rounded-pill bg-accent-300 px-1.5 text-[8px] leading-3.5 font-extrabold text-accent-700">
                생일
              </span>
              <span className="text-[11px] leading-tight font-extrabold tracking-[-0.02em] text-ink md:text-label">
                포포야, 생일 축하해
              </span>
              <Bar className="hidden w-3/4 md:block" />
            </span>
            <span className="hidden size-6 shrink-0 rounded-[3px] bg-line md:block" />
          </span>
        </Screen>
      );
    case "STORY":
      return (
        <Screen>
          <span className="grid h-full w-full gap-2 md:grid-cols-2">
            <StoryCard tag="분실물" />
            <span className="hidden md:contents">
              <StoryCard tag="칭찬" />
            </span>
          </span>
        </Screen>
      );
  }
}

/** TV 화면 틀(16:9). 밝은 바탕에 얇은 테두리 */
function Screen({ children }: { children: ReactNode }) {
  return (
    <span className="flex aspect-video w-full items-center rounded-lg bg-surface p-2 shadow-card ring-1 ring-black/5 md:max-w-60 md:px-3 md:py-2.5">
      {children}
    </span>
  );
}

function Bar({ className }: { className?: string }) {
  return <span className={cn("block h-1 rounded-[2px] bg-line", className)} />;
}

function StoryCard({ tag }: { tag: string }) {
  return (
    <span className="flex flex-col gap-1 rounded-md bg-canvas p-1.5 ring-1 ring-surface-muted md:p-2">
      <span className="inline-flex h-3.5 self-start rounded-pill bg-type-story-bright/60 px-1.5 text-[8px] leading-3.5 font-extrabold text-type-story">
        {tag}
      </span>
      <Bar className="bg-line-strong" />
      <Bar className="w-4/5 bg-line-strong" />
    </span>
  );
}

/** 올리기 대화상자: 한 줄 설명과 규칙만 있는 작은 카드 */
export function UploadChoicesCompact() {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {SUBMISSION_KINDS.map((kind) => {
        const copy = COPY[kind];
        const style = KIND_STYLE[kind];
        const ready = copy.href !== null;
        const body = (
          <div className="flex flex-1 flex-col gap-0.5 p-5">
            <div className="flex items-center gap-3">
              <TypeIcon kind={kind} size="sm" />
              <h2 className="text-subhead font-extrabold tracking-[-0.02em] text-ink">
                {KIND_INFO[kind].name}
              </h2>
            </div>
            <p className="mt-1.5 text-label text-ink-muted">
              {copy.description}
            </p>
            <div className="mt-auto flex items-center gap-1.5 pt-3 text-caption text-ink-subtle">
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
                  준비 중
                </span>
              )}
            </div>
          </div>
        );
        const frame =
          "flex min-w-0 flex-col overflow-hidden rounded-card bg-surface ring-1 ring-line";
        return ready ? (
          <Link
            key={kind}
            to={copy.href!}
            className={cn(
              frame,
              "transition-shadow hover:shadow-floating hover:ring-line-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
            )}
          >
            {body}
          </Link>
        ) : (
          <div
            key={kind}
            className={cn(frame, "opacity-75")}
            aria-disabled="true"
          >
            {body}
          </div>
        );
      })}
    </div>
  );
}
